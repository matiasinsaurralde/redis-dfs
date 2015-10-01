var DRFS = require( './' ),
    drfs = new DRFS();


drfs.addHosts( [ 'x.x.x.x', 'x.x.x.x' ] );

drfs.put( 'american_woman.mp3', function( files ) {
  console.log( '-> put ok!', files );
} );
