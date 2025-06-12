// ==========================================================================
// 							DG.AnimationMath
// 
// 	A collection of math utility functions for use in animation.
// 	
// 	Author:		Craig D. Miller
// 	Copyright:	2010 by University of Massachusetts, all rights reserved.
// 	Change Record:
// 		11/13/10	Bill	Ported from desktop TinkerPlots
// 	
// ==========================================================================
//	globals DG

DG.AnimationMath = {

	kAnimationBias: 0.7,
	kAnimationGain: 0.3,

	//  Bias
	// 
	// 	Returns a "gamma correction" or exponential adjusted 't' value 
	// 	in range [0.0 - 1.0]. Parameter 'a' adjusts the exponent curve shape,
	// 	0.5 is a "y=x" function.
	// 
	// 	From "Fast Alternatives to Perlin's Bias and Gain Functions,
	// 	Graphics Gems, IV p. 401.  Page 402 has useful diagrams.
	Bias: function( 
		t,	//  curve sampling parameter [0.0 - 1.0]
		a )	//	curve shaping parameter [0.0 - 1.0] (defaults to kAnimationBias
	{
		var r;
		if( !a)
			a = this.kAnimationBias;
	
		if ( 		a <= 0.000001 )	// should be "if ( a == 0.0 )" but handle roundoff error.
			r = 0.0;
		else if (	a >= 0.999999 ) 
			r = 1.0;
		else
			r = t / (( 1/a - 2 ) * ( 1 - t ) + 1);
		return r;
	},


	//  Gain
	// 
	// 	Returns a symmetrical "s-curve" adjusted 't' value
	// 	in the range [0.0 - 1.0].   Parameter 'a' adjusts the S curve shape,
	// 	0.5 is a "y=x" function.
	// 
	// 	From "Fast Alternatives to Perlin's Bias and Gain Functions",
	// 	Graphics Gems, IV p. 401.  Page 402 has useful diagrams.
	Gain: function( 
		t,	//  curve sampling parameter [0.0 - 1.0]
		a )	//	curve shaping parameter [0.0 - 1.0] (defaults to kAnimationGain
	{
		var r;		
		if( !a)
			a = this.kAnimationGain;
	
		if ( 		a <= 0.000001 )	// should be "if ( a == 0.0 )" but handle roundoff error.
			r = 0.0;
		else if (	a >= 0.999999 )
			r = 1.0;
		else {
			r = ( 1/a - 2 ) * ( 1 - 2*t );
	
			if ( t < 0.5 )
				r = t / (r + 1);
			else
				r = (r - t)/(r - 1);
		}
		return r;
	},
	
	// DefaultAnimationTween
	//	Given a fraction between 0 and 1, return a new fraction to use in tweening
	//	by applying the default Gain to the defatul Bias.
	DefaultAnimationTween: function( t) {
		return this.Gain( this.Bias( t));
	}

};
