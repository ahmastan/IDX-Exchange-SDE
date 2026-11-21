# Week 9 — Performance Optimization

Measured on the local Docker MySQL 8 (`rets_property`: 55,212 rows;
`rets_openhouse`: 13,433 rows). Reproduce with `npm run explain` in `backend/`.
Times are the median of 7 runs.

## 1. Reading EXPLAIN

`EXPLAIN <query>` shows the plan MySQL picked without running the query. The
script uses `FORMAT=TRADITIONAL` (MySQL 8 defaults to a tree format). Each row of
the output is one table access, and the columns mean:

| Column | Meaning |
|---|---|
| `id` | Which `SELECT` in the statement the row belongs to. A subquery or derived table gets its own id. |
| `select_type` | The kind of `SELECT`: `SIMPLE` (no subqueries), `PRIMARY` (outermost), `DERIVED` (a subquery in `FROM`, like the deferred-join page), `DEPENDENT SUBQUERY` (re-run per outer row). |
| `table` | The table being read. `<derived2>` means the result of the derived table with id 2. |
| `partitions` | Partitions read; `NULL` because these tables aren't partitioned. |
| `type` | **The access method — the most important column.** Best to worst: `const` / `eq_ref` (at most one row via a unique key), `ref` (index lookup on equality), `range` (index range scan, e.g. `price >= ?`), `index` (reads the *entire* index), `ALL` (reads the *entire table*). |
| `possible_keys` | Indexes that could apply to the `WHERE` clause. |
| `key` | The index actually chosen. `NULL` means none was used. |
| `key_len` | How many bytes of the index key are used. In a multi-column index this tells you how many leading columns took part (for example, only `city`, or `city` + `price`). |
| `ref` | What is compared against the index: a constant (`const`) or a column from an earlier table. |
| `rows` | MySQL's **estimate** of the rows it must examine, taken from sampled index statistics. It is not an actual count: the table has 55,212 rows, but full scans here are estimated at 35,505. |
| `filtered` | The estimated percentage of those rows that survive the rest of the `WHERE`. `rows × filtered%` is roughly the number of rows passed on. |
| `Extra` | Notes on how the rows are handled. `Using index` means the query is answered entirely from the index (*covering*), which is good. `Using where` means the rows are filtered after being read. `Using index condition` means the filter is pushed down into the index. `Using filesort` means an extra sort step, because rows don't come out of an index in the requested order. `Using temporary` means an internal temp table was needed. |

## 2. Before: no indexes for our filters

The dump only had indexes on `L_ListingID`, `L_City`, `L_Zip` and a few others.

| Query (COUNT for pagination) | type | key | est. rows | ms |
|---|---|---|---|---|
| city | index | idx_L_City | 35,505 | 5.3 |
| city + minPrice | **ALL** | – | 35,505 | **407.9** |
| city + minPrice + beds | **ALL** | – | 35,505 | **407.2** |
| zipcode | range | idx_L_Zip | 269 | 0.34 |
| price range | **ALL** | – | 35,505 | **401.1** |
| beds + baths | **ALL** | – | 35,505 | **402.2** |

| Query (page of 20, with ORDER BY) | type | Extra | ms |
|---|---|---|---|
| city + price, sort price desc | **ALL** | Using where; Using filesort | **1,285** |
| no filter, sort date desc | **ALL** | Using filesort | **1,301** |
| beds ≥ 3, sort price asc ¹ | **ALL** | Using where; Using filesort | **1,281** |
| price range, sort sqft asc ¹ | **ALL** | Using where; Using filesort | **1,286** |

¹ Measured afterwards on the same database, with `IGNORE INDEX (...)` naming
all five new indexes and the original single-query form (no deferred join).
That is equivalent to the "before" state.

How to read this:

- **`city` still costs 5 ms.** The filter is `LOWER(TRIM(L_City)) = ?`. Wrapping
  the column in functions hides it from the plain `idx_L_City`, so MySQL can't
  seek. It scans the whole index instead (`type = index`, all 35k entries) and
  evaluates the function on every entry.
- **Every price, beds or baths filter is a full table scan (`ALL`).**
  `rets_property` has hundreds of columns, so its rows are wide, and reading all
  of them costs about 400 ms.
- **Sorted pages are the worst case, at about 1.3 s.** A full scan plus
  `filesort` means sorting every matching wide row only to keep 20 of them.

## 3. Changes

All of these are in `db/property_search_indexes.sql`, which was applied to the
local database.

| Index | Serves |
|---|---|
| `idx_city_price ((LOWER(TRIM(L_City))), L_SystemPrice)` | City filter (a functional key part on the *exact* expression the query uses), plus city + price as one range scan |
| `idx_price (L_SystemPrice)` | Price filter on its own, and price sorting |
| `idx_beds_baths (L_Keyword2, LM_Dec_3, L_SystemPrice, LM_Int2_3, ListingContractDate)` | Beds and baths filters. The extra columns make it **covering**, so beds/baths combined with a price filter or any sort never has to read the wide rows. |
| `idx_listing_date (ListingContractDate)` | Sorting by date listed |
| `idx_sqft (LM_Int2_3)` | Sorting by square feet |

**Query change: the deferred join.** Even with indexes, `ORDER BY col IS NULL,
col` (nulls-last sorting) can't be read in index order. Without a filter, that
still meant sorting all 55k wide rows. The page query now sorts and limits
**only the ids** in a subquery, which MySQL can do from a small index, then
fetches full rows for just those 20 ids:

```sql
SELECT <columns> FROM rets_property
JOIN (SELECT id FROM rets_property WHERE ... ORDER BY ... LIMIT ? OFFSET ?) AS page USING (id)
ORDER BY ...
```

Indexing beds and baths alone wasn't enough. With `idx_beds_baths` on just
`(L_Keyword2, LM_Dec_3)` and the deferred join in place, "3+ beds, sort by
square feet" still took about 710 ms. The 17k matching rows had to be read from
the table to get their sqft. Adding the price, sqft and date columns made the
index covering, and that query and "3+ beds, sort by price" both dropped to a
few ms.

## 4. After

| Query (COUNT) | type | key | est. rows | Extra | ms | Before |
|---|---|---|---|---|---|---|
| city | ref | idx_city_price | 723 | – | 1.37 | 5.3 |
| city + minPrice | range | idx_city_price | 723 | Using where | 1.25 | 407.9 |
| city + minPrice + beds | range | idx_city_price | 723 | Using where | 1.13 | 407.2 |
| zipcode | range | idx_L_Zip | 269 | Using index | 0.23 | 0.34 |
| price range | range | idx_price | 490 | Using index | 0.24 | 401.1 |
| beds + baths | range | idx_beds_baths | 371 | Using index | 0.21 | 402.2 |
| beds (sort price asc) | range | idx_beds_baths | 17,752 | Using index | 2.34 | – |

| Page query (deferred join, LIMIT 20) | inner access | ms | Before |
|---|---|---|---|
| city | ref idx_city_price | 1.61 | 3.5 |
| beds, sort price asc | range idx_beds_baths (covering) | 3.74 | 1,281 |
| price range, sort sqft asc | range idx_beds_baths (skip scan, covering) | 3.03 | 1,286 |
| city + price, sort price desc | range idx_city_price | 1.12 | 1,285 |
| no filter, sort date desc | index idx_listing_date (covering) | 5.19 | 1,301 |

The worst search request went from about 1.3 s to about 5 ms. The `Using
filesort` that remains in the page plans now sorts at most a few thousand
narrow index entries (or the 20-row derived table), not full rows.

The backend Jest suite, which runs against this database, went from 5.3 s to
1.4 s.

### Annotated: the most complex search

`city=Irvine&minPrice=300000&beds=3&sortBy=L_SystemPrice&sortOrder=desc`,
taking 1.8 ms:

| id | select_type | table | type | possible_keys | key | key_len | ref | rows | filtered | Extra |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | PRIMARY | `<derived2>` | ALL | – | – | – | – | 20 | 100 | Using temporary; Using filesort |
| 1 | PRIMARY | rets_property | eq_ref | PRIMARY | PRIMARY | 4 | page.id | 1 | 100 | – |
| 2 | DERIVED | rets_property | range | idx_price, idx_beds_baths, idx_city_price | idx_city_price | 208 | – | 723 | 50 | Using where; Using filesort |

Read it from the inside out, starting with id 2:

1. **id 2, `DERIVED`:** the subquery that picks the page's ids.
   - **Index choice.** `possible_keys` lists all three indexes that match some
     condition. The optimizer picked `idx_city_price`, because a city narrows
     to the fewest rows.
   - **`type = range`, `key_len = 208`.** 208 bytes means both key parts are
     used. `LOWER(TRIM(L_City))` is a `VARCHAR(50)` in utf8mb4: 50 × 4 bytes
     + 2 length bytes + 1 NULL flag = 203. `L_SystemPrice` is an `INT`: 4 + 1
     NULL flag = 5. So MySQL seeks to `city = 'irvine' AND price >= 300000`
     directly, rather than seeking the city and then filtering by price.
   - **`rows = 723`.** That's the estimate for Irvine.
   - **`filtered = 50`.** MySQL guesses half of those 723 rows pass the
     remaining `beds >= 3` check, which is `Using where`.
   - **`Using filesort`.** It sorts those few hundred rows by
     `price IS NULL, price DESC, id DESC`. That is cheap at this size.
2. **id 1, `<derived2>`, `type = ALL` over 20 rows.** This scans the 20 ids the
   subquery produced. `Using temporary; Using filesort` is the outer
   `ORDER BY` putting those 20 rows back in order, which a join doesn't
   preserve.
3. **id 1, `rets_property`, `eq_ref` on `PRIMARY`.** For each of the 20 ids it
   fetches exactly one full row by primary key: `key_len = 4` (the `INT` id),
   `ref = page.id`. This is the only step that reads wide rows, and it reads
   only 20.

## 5. GET /api/openhouses (calendar)

```
o: ALL (13,433)   Using where; Using filesort
p: eq_ref PRIMARY
p2: ref idx_L_ListingID  Using index    (MAX(id) per listing)
```

- For the busiest grid (Aug 30 – Oct 10, about 12,000 open houses) the query takes
  about 720 ms and returns about 3.7 MB. Every other month takes about 1 ms.
- The full scan of `rets_openhouse` is the optimizer's correct choice there,
  even though `idx_OpenHouseDate` exists: about 90% of the table is in that
  range, and a full scan beats 12,000 index lookups. For a quiet month it uses
  the index.
- Most of the time goes to the per-row work. Joining each event to its newest
  property row takes about 370 ms, and extracting `OpenHouseType` /
  `OpenHouseRemarks` from the 1.5 KB `all_data` JSON takes about 200 ms.
- Sending `all_data` raw instead would have been about 19 MB.
- If this ever matters, the next steps are:
  - stored generated columns for the two JSON fields;
  - a summary endpoint (counts per day) for the month view, fetching a day's
    events only when it is opened.

## 6. Request timing (item 54)

`src/middleware/requestLogger.js` logs one line per request with the response
time in milliseconds. It measures with `process.hrtime.bigint()` and is mounted
first, so the time covers every other middleware:

```
2026-11-20T18:52:10.123Z GET /api/properties?city=Irvine&sortBy=L_SystemPrice 200 4.1ms
```
