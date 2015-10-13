var DRFS = require( './' ),
    drfs = new DRFS(),
    fs = require( 'fs' );

var hosts = fs.readFileSync( 'official_test_hosts' ).toString().split( "\n" );
    hosts.pop(); // remove last/empty \n :o

drfs.addHosts( hosts );

drfs.get( 'JoeWilliams-StackODollars.mp3', function( err, data ) {
});
