-- Indexes for GET /api/properties filters.
-- Run once (MySQL has no CREATE INDEX IF NOT EXISTS; re-running errors with "Duplicate key name"):
--   docker exec -i idx-mysql-local sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" rets' < db/property_search_indexes.sql
--
-- Already present from the provided SQL dump: idx_L_Zip (used by the zipcode
-- filter) and idx_L_City (NOT usable by our city filter, see below).

-- The dump defines active_check with a '0000-00-00 00:00:00' default, which
-- strict mode rejects when CREATE INDEX rebuilds the table ("Invalid default
-- value for 'active_check'"). Allow zero dates for this session only; the
-- server-wide setting and the data are unchanged.
SET SESSION sql_mode = REPLACE(REPLACE(@@SESSION.sql_mode, 'NO_ZERO_IN_DATE', ''), 'NO_ZERO_DATE', '');

-- City filter + price filter, the most common combination.
-- The city filter compares LOWER(TRIM(L_City)), and wrapping a column in a
-- function hides it from a plain index on L_City. A functional key part
-- indexes the result of the exact same expression, so MySQL can seek on it.
-- Price is the second column so "city + minPrice/maxPrice" is one range scan.
CREATE INDEX idx_city_price ON rets_property ((LOWER(TRIM(L_City))), L_SystemPrice);

-- Price on its own (min/max price without a city)
CREATE INDEX idx_price ON rets_property (L_SystemPrice);

-- Beds + baths (beds and baths filters, alone or together). The extra
-- columns make it a "covering" index for those filters: price, sqft and date
-- are stored in the index too, so a beds/baths filter combined with a price
-- filter or any sort can be answered from the index alone, without reading
-- the very wide table rows (Week 9: with only (L_Keyword2, LM_Dec_3),
-- "3+ beds sorted by sqft" still took ~710 ms; covering, it takes a few ms).
-- If an older two-column idx_beds_baths already exists, run
-- "DROP INDEX idx_beds_baths ON rets_property;" before this file.
CREATE INDEX idx_beds_baths ON rets_property (L_Keyword2, LM_Dec_3, L_SystemPrice, LM_Int2_3, ListingContractDate);

-- Sorting (Week 9). An index stores its rows already in order, so
-- "ORDER BY col ... LIMIT 20" can read the first 20 entries instead of
-- sorting every matching row ("Using filesort" in EXPLAIN). InnoDB appends the
-- primary key (id) to every secondary index, so the id tie-breaker comes free.
-- Price sorting is covered by idx_price above and beds by idx_beds_baths.
CREATE INDEX idx_listing_date ON rets_property (ListingContractDate);
CREATE INDEX idx_sqft ON rets_property (LM_Int2_3);

-- Refresh the table statistics the optimizer uses to pick an index
ANALYZE TABLE rets_property;
