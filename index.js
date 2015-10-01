var fs = require( 'fs' ),
    async = require( 'async' );

const concurrentUploads = 2;

function DRFS() {
  console.log( 'DRFS()' );
  this.hosts = [];
};

DRFS.prototype.asd = function() {
};

DRFS.prototype.addHost = function( host ) {
  console.log( '+host', host );
};

DRFS.prototype.addHosts = function( hosts ) {
  var self = this;
  hosts.forEach( function( e ) {
    self.addHost(e);
  });
};

DRFS.prototype.splitFile = function(fname, callback) {

  var stream = fs.createReadStream( fname ),
      fragmentMaxSize = 2500000,
//      fragmentMaxSize = 1000000,
      fragmentSize = 0,
      fragmentIndex = 0,
      fragments = {};

  var total = 0;

  stream.on( 'data', function(chunk) {
    if( !fragments[fragmentIndex ] ) {
      fragments[fragmentIndex] = [];
    };
    fragments[ fragmentIndex ].push( chunk );
    finalSize = fragmentSize + chunk.length;
    if( finalSize > fragmentMaxSize ) {
      fragmentIndex++;
      fragmentSize = 0;
    };
    fragmentSize += chunk.length;
    total += chunk.length;
  });

  stream.on( 'end', function() {
    var _fragments = [],
        files = [];

    for( i in fragments ) {
      var f = fragments[i];
      _fragments.push( [ Buffer.concat(f), parseInt(i) ] );
    };

    async.eachSeries( _fragments, function( e, callback ) {
      var buf = e[0],
          index = e[1];
          fragmentPath = 'tmp/' + fname + '.' + index;
      fs.writeFile( fragmentPath, buf, function(err) {
        console.log( 'Generando fragmento ', fragmentPath, 'con', buf.length, 'bytes');
        files.push( fragmentPath );
        callback();
      });
    }, function( err ) {
      callback( files );
    });

  });
};

DRFS.prototype.put = function( fname, callback ) {

  var self = this,
      fragments = [],
      uploadQueue = async.queue( function( file, callback ) {
        console.log( 'upload!', file );
        setTimeout( function() { callback() }, 5000 );
      }, concurrentUploads );

  uploadQueue.drain = function() {
    console.log( 'opa!', fragments );
  };

  self.splitFile( fname, function( files ) {
    files.forEach( function( file ) {
      uploadQueue.push( file, function() {
        fragments.push( file );
      });
    });
  });
};

DRFS.prototype.uploadFragment = function( file ) {
  console.log( '-> upload', file );
};


module.exports = DRFS;
