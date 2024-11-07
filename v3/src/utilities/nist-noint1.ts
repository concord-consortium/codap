export const data = [
  { x: 60, y: 130 },
  { x: 61, y: 131 },
  { x: 62, y: 132 },
  { x: 63, y: 133 },
  { x: 64, y: 134 },
  { x: 65, y: 135 },
  { x: 66, y: 136 },
  { x: 67, y: 137 },
  { x: 68, y: 138 },
  { x: 69, y: 139 },
  { x: 70, y: 140 },
]

export const certifiedResults = {
  slope: 2.07438016528926,
  sdSlope: 0.165289256198347E-01,
  sdResiduals: 3.56753034006338,
  rSquared: 0.999365492298663
}

// http://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/NoInt1.dat

/*
NIST/ITL StRD
Dataset Name:  NoInt1 (NoInt1.dat)

File Format:   ASCII
               Certified Values (lines 31 to 44)
               Data             (lines 61 to 71)

Procedure:     Linear Least Squares Regression

Reference:     Eberhardt, K., NIST.

Data:          1 Response Variable (y)
               1 Predictor Variable (x)
               11 Observations
               Average Level of Difficulty
               Generated Data

Model:         Linear Class
               1 Parameter (B1)

               y = B1*x + e


               Certified Regression Statistics

                                          Standard Deviation
     Parameter          Estimate             of Estimate

        B1          2.07438016528926     0.165289256198347E-01

     Residual
     Standard Deviation   3.56753034006338

     R-Squared            0.999365492298663

               Certified Analysis of Variance Table

Source of Degrees of    Sums of             Mean
Variation  Freedom      Squares            Squares          F Statistic

Regression    1    200457.727272727   200457.727272727   15750.2500000000
Residual     10    127.272727272727   12.7272727272727


Data:     y     x
         130    60
         131    61
         132    62
         133    63
         134    64
         135    65
         136    66
         137    67
         138    68
         139    69
         140    70
*/
