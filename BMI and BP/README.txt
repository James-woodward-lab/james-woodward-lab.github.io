BMI & Blood Pressure Centile Calculator - v9 static no-Node build

How to run
1. Unzip the folder.
2. Open index.html in a browser.
3. Enter measurements and calculate.

API key
The RCPCH API key is stored in assets/config.js. In this static version it is visible to anyone who can access the folder/page. Do not publish publicly.

What changed in v9
- No Node and no npm required.
- RCPCH API calls are made directly from the browser.
- BMI and height centiles are obtained from the RCPCH API.
- % median BMI is now read directly from measurement_calculated_values.corrected_percentage_median_bmi / chronological_percentage_median_bmi in the BMI response.
- This removes the previous binary-search step and reduces normal API usage to 2 POST calls per calculation: one height and one BMI.
- Browser CORS preflight may still create OPTIONS requests, but those are not application calculation calls.

Clinical/testing note
This is a testing build. Local validation and clinical safety sign-off are required before clinical deployment. The BP module uses embedded Jackson 2007-derived testing data and remains labelled as requiring local validation.
