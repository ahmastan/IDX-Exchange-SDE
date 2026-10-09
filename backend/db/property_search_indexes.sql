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

-- Beds + baths (beds and baths filters, alone or together)
CREATE INDEX idx_beds_baths ON rets_property (L_Keyword2, LM_Dec_3);

-- Refresh the table statistics the optimizer uses to pick an index
ANALYZE TABLE rets_property;
