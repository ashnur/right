1) multiplication of 3x-3 with x^2 -> [0, 0,-3, 3];
2) matching of leading coefficients by multiplying the first with the leading coefficient of the second and vice versa (-> [-3, 0, 0, 3] and [0, 0,-3, 3])
3) take the difference [-3, 0, 0, 3] - [0, 0,-3, 3] = [ 3, 0, -3];
4) replace the larger polynomial (here [-1, 0, 0, 1]) with this result

that is, gcd([-1,0,0,1], [-3,3]) = gcd([-3,0,3], [-3,3])
repeat until no reduction possible -> you have the gcd
essentially i'm using gcd(a,b) = gcd(a-t*b, b) for factors t by dividing them with their GCD.
in the example above, t = x^2
well, plus some rescaling to find identical leading coefficients and then subtract
so essentially in the example above,
if f = x^3-1 and g = 3x-3, i am using gcd(f, g) = gcd(f-x^2*g, g) = gcd((-3)*f-(-1)*x^2*g, g)
(the latter step essentially uses that the gcd of your polynomials is only unique up to arbitrary real factors)
the last part is because reals are what mathematically are called the "units" of your ring (which is the set of polynomials)
similarly to the gcd on integers being unique only up to a change of sign
