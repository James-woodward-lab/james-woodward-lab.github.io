// Jackson 2007-derived testing scaffold.
// IMPORTANT: These arrays are for local validation/testing of the calculation engine and UI.
// Replace/verify against locally approved Jackson 2007 GB BP reference values before clinical use.
// Format uses approximate centile threshold values by sex and completed integer age for p50,p90,p95,p99.
window.BP_REFERENCE = {
  source: "Jackson 2007 Great Britain BP centiles - testing scaffold; requires local validation",
  minAge: 4,
  maxAge: 18,
  data: {
    male: [
      {age:4,sbp:{p50:94,p90:106,p95:110,p99:118},dbp:{p50:56,p90:68,p95:72,p99:80}},
      {age:5,sbp:{p50:96,p90:108,p95:112,p99:120},dbp:{p50:57,p90:69,p95:73,p99:81}},
      {age:6,sbp:{p50:98,p90:110,p95:114,p99:122},dbp:{p50:58,p90:70,p95:74,p99:82}},
      {age:7,sbp:{p50:100,p90:112,p95:116,p99:124},dbp:{p50:59,p90:71,p95:75,p99:83}},
      {age:8,sbp:{p50:102,p90:114,p95:118,p99:126},dbp:{p50:60,p90:72,p95:76,p99:84}},
      {age:9,sbp:{p50:104,p90:116,p95:120,p99:128},dbp:{p50:61,p90:73,p95:77,p99:85}},
      {age:10,sbp:{p50:106,p90:118,p95:122,p99:130},dbp:{p50:62,p90:74,p95:78,p99:86}},
      {age:11,sbp:{p50:108,p90:120,p95:124,p99:132},dbp:{p50:63,p90:75,p95:79,p99:87}},
      {age:12,sbp:{p50:111,p90:123,p95:127,p99:135},dbp:{p50:64,p90:76,p95:80,p99:88}},
      {age:13,sbp:{p50:114,p90:126,p95:130,p99:138},dbp:{p50:65,p90:77,p95:81,p99:89}},
      {age:14,sbp:{p50:117,p90:129,p95:133,p99:141},dbp:{p50:66,p90:78,p95:82,p99:90}},
      {age:15,sbp:{p50:120,p90:132,p95:136,p99:144},dbp:{p50:67,p90:79,p95:83,p99:91}},
      {age:16,sbp:{p50:122,p90:134,p95:138,p99:146},dbp:{p50:68,p90:80,p95:84,p99:92}},
      {age:17,sbp:{p50:124,p90:136,p95:140,p99:148},dbp:{p50:69,p90:81,p95:85,p99:93}},
      {age:18,sbp:{p50:126,p90:138,p95:142,p99:150},dbp:{p50:70,p90:82,p95:86,p99:94}}
    ],
    female: [
      {age:4,sbp:{p50:93,p90:105,p95:109,p99:117},dbp:{p50:56,p90:68,p95:72,p99:80}},
      {age:5,sbp:{p50:95,p90:107,p95:111,p99:119},dbp:{p50:57,p90:69,p95:73,p99:81}},
      {age:6,sbp:{p50:97,p90:109,p95:113,p99:121},dbp:{p50:58,p90:70,p95:74,p99:82}},
      {age:7,sbp:{p50:99,p90:111,p95:115,p99:123},dbp:{p50:59,p90:71,p95:75,p99:83}},
      {age:8,sbp:{p50:101,p90:113,p95:117,p99:125},dbp:{p50:60,p90:72,p95:76,p99:84}},
      {age:9,sbp:{p50:103,p90:115,p95:119,p99:127},dbp:{p50:61,p90:73,p95:77,p99:85}},
      {age:10,sbp:{p50:105,p90:117,p95:121,p99:129},dbp:{p50:62,p90:74,p95:78,p99:86}},
      {age:11,sbp:{p50:107,p90:119,p95:123,p99:131},dbp:{p50:63,p90:75,p95:79,p99:87}},
      {age:12,sbp:{p50:109,p90:121,p95:125,p99:133},dbp:{p50:64,p90:76,p95:80,p99:88}},
      {age:13,sbp:{p50:111,p90:123,p95:127,p99:135},dbp:{p50:65,p90:77,p95:81,p99:89}},
      {age:14,sbp:{p50:113,p90:125,p95:129,p99:137},dbp:{p50:66,p90:78,p95:82,p99:90}},
      {age:15,sbp:{p50:114,p90:126,p95:130,p99:138},dbp:{p50:67,p90:79,p95:83,p99:91}},
      {age:16,sbp:{p50:115,p90:127,p95:131,p99:139},dbp:{p50:68,p90:80,p95:84,p99:92}},
      {age:17,sbp:{p50:116,p90:128,p95:132,p99:140},dbp:{p50:69,p90:81,p95:85,p99:93}},
      {age:18,sbp:{p50:117,p90:129,p95:133,p99:141},dbp:{p50:70,p90:82,p95:86,p99:94}}
    ]
  }
};
