export const data = [
  { y: 0.1, x: 0.2 },
  { y: 338.8, x: 337.4 },
  { y: 118.1, x: 118.2 },
  { y: 888.0, x: 884.6 },
  { y: 9.2, x: 10.1 },
  { y: 228.1, x: 226.5 },
  { y: 668.5, x: 666.3 },
  { y: 998.5, x: 996.3 },
  { y: 449.1, x: 448.6 },
  { y: 778.9, x: 777.0 },
  { y: 559.2, x: 558.2 },
  { y: 0.3, x: 0.4 },
  { y: 0.1, x: 0.6 },
  { y: 778.1, x: 775.5 },
  { y: 668.8, x: 666.9 },
  { y: 339.3, x: 338.0 },
  { y: 448.9, x: 447.5 },
  { y: 10.8, x: 11.6 },
  { y: 557.7, x: 556.0 },
  { y: 228.3, x: 228.1 },
  { y: 998.0, x: 995.8 },
  { y: 888.8, x: 887.6 },
  { y: 119.6, x: 120.2 },
  { y: 0.3, x: 0.3 },
  { y: 0.6, x: 0.3 },
  { y: 557.6, x: 556.8 },
  { y: 339.3, x: 339.1 },
  { y: 888.0, x: 887.2 },
  { y: 998.5, x: 999.0 },
  { y: 778.9, x: 779.0 },
  { y: 10.2, x: 11.1 },
  { y: 117.6, x: 118.3 },
  { y: 228.9, x: 229.2 },
  { y: 668.4, x: 669.1 },
  { y: 449.2, x: 448.9 },
  { y: 0.2, x: 0.5 }
]

export const certifiedResults = {
  count: 36,
  intercept: -0.262323073774029,
  slope: 1.00211681802045,
  sdIntercept: 0.232818234301152,
  sdSlope: 0.429796848199937E-03,
  sdResiduals: 0.884796396144373,
  rSquared: 0.999993745883712
}

// http://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/Norris.dat

/*
NIST/ITL StRD
Dataset Name:  Norris (Norris.dat)

File Format:   ASCII
               Certified Values  (lines 31 to 46)
               Data              (lines 61 to 96)

Procedure:     Linear Least Squares Regression

Reference:     Norris, J., NIST.
               Calibration of Ozone Monitors.

Data:          1 Response Variable (y)
               1 Predictor Variable (x)
               36 Observations
               Lower Level of Difficulty
               Observed Data

Model:         Linear Class
               2 Parameters (B0,B1)

               y = B0 + B1*x + e


               Certified Regression Statistics

                                          Standard Deviation
     Parameter          Estimate             of Estimate

        B0        -0.262323073774029     0.232818234301152
        B1         1.00211681802045      0.429796848199937E-03

     Residual
     Standard Deviation   0.884796396144373

     R-Squared            0.999993745883712

               Certified Analysis of Variance Table

Source of Degrees of    Sums of             Mean
Variation  Freedom      Squares            Squares           F Statistic

Regression    1     4255954.13232369   4255954.13232369   5436385.54079785
Residual     34     26.6173985294224   0.782864662630069

Data:       y          x
           0.1        0.2
         338.8      337.4
         118.1      118.2
         888.0      884.6
           9.2       10.1
         228.1      226.5
         668.5      666.3
         998.5      996.3
         449.1      448.6
         778.9      777.0
         559.2      558.2
           0.3        0.4
           0.1        0.6
         778.1      775.5
         668.8      666.9
         339.3      338.0
         448.9      447.5
          10.8       11.6
         557.7      556.0
         228.3      228.1
         998.0      995.8
         888.8      887.6
         119.6      120.2
           0.3        0.3
           0.6        0.3
         557.6      556.8
         339.3      339.1
         888.0      887.2
         998.5      999.0
         778.9      779.0
          10.2       11.1
         117.6      118.3
         228.9      229.2
         668.4      669.1
         449.2      448.9
           0.2        0.5
*/
