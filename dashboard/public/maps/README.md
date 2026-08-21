# ZIP boundary assets

`zcta-east.geojson` and `zcta-arizona.geojson` contain simplified 2020 Census
ZIP Code Tabulation Area geometry from the U.S. Census Bureau TIGERweb service.
They cover the operating regions around the current Louisville, Columbus,
Jeffersonville, and Gilbert studios rather than the entire United States.

Source layer:
`https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1`

The files were downloaded on August 20, 2026 with WGS84 output, geometry
precision 4, and a maximum allowable offset of 0.002 degrees. ZCTAs approximate
USPS ZIP delivery areas and should be used for business visualization, not
mail-delivery validation.
