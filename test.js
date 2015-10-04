var DRFS = require( './' ),
    drfs = new DRFS();


drfs.addHosts( [ 'x.x.x.x', 'x.x.x.x' ] );

drfs.put( 'JoeWilliams-StackODollars.mp3', function( files ) {
  console.log( '-> put ok!', files );
} );
