var fs = require( 'fs' ),
    async = require( 'async' ),
    Redis = require( 'redis' ),
    zlib = require( 'zlib' );
    gzip = zlib.createGzip(),
    chunkingStreams = require( 'chunking-streams' ),
    path = require( 'path' );

const concurrentUploads = 2,
      tmpDir = '/tmp/redis-dfs',
      defaultChunkSize = 800000;

if( !fs.existsSync( tmpDir ) ) {
  console.log( '=> Creating tmp dir', tmpDir );
  fs.mkdirSync( tmpDir );
};

var LineCounter = chunkingStreams.LineCounter,
    SeparatorChunker = chunkingStreams.SeparatorChunker,
    SizeChunker = chunkingStreams.SizeChunker;

function DRFS() {

  console.log('DRFS()');

  this.hosts = [];

  this.uploadIndex = 0;

  this.addHost = function(host) {
    console.log('+host', host);
    this.hosts.push( host );
  };

  this.addHosts = function(hosts) {
    var self = this;
    hosts.forEach(function(e) {
      self.addHost(e);
    });
  };

  this.put = function(file, callback) {

    var self = this,
        readableStream = fs.createReadStream( file ),
        chunker = new SizeChunker({
          chunkSize: defaultChunkSize,
          flushTail: true
        }),
        dest,
        output;

    chunker.on('chunkStart', function(id, done) {
      console.log( '-> Writing chunk', id );
      dest = path.join( tmpDir, id + '.gz' );
      output = fs.createWriteStream( dest );
      done();
    });

    chunker.on('chunkEnd', function(id, done) {
      self.uploadChunk( file, id, dest );
      output.end();
      done();
    });

    chunker.on('data', function(chunk) {
      output.write(chunk.data);
    });

    chunker.on( 'end', function() {
      console.log( '-> Chunker ends' );
    });

    readableStream.pipe(gzip).pipe(chunker);

  };

  this.uploadChunk = function( file, id, dest ) {

    /*
      currently the program matches the chunk id
      with the host id (so the sample code works :p).
      after splitting the file in chunks
      we SET each chunk as a diferent key,
      on a different host, chunk #1 => host #1, and so on.
    */

    var host = this.hosts[ this.uploadIndex ].split( ':' ),
        redis = Redis.createClient( host[1], host[0], { return_buffers: true } ),
        keyName = [ file, id ].join( ':' );

    console.log( '=> Using host', host[0], 'for', file );

    fs.readFile( dest, function( err, data ) {
      console.log( 'redis.set', data );
      redis.set( keyName, data, function( err, reply ) {
        console.log( 'upload ok?', err, reply );

        fs.unlink( dest );
      });
    });

    this.uploadIndex++;
  };

  /*
    this strategy is more generic, we iterate through
    all available keys and we focus on keys that match
    the requested file name, the key name consists of
    the original file name & the chunk id, allowing us
    to reconstruct the data.
  */

  this.get = function( file, callback ) {
    console.log( '-> Get', file );

    var matchingKeys = {},
        chunks = [];

    async.each( this.hosts, function( host, callback ) {
      var host = host.split( ':' ),
          redis = Redis.createClient( host[1], host[0], { return_buffers: true } );

      redis.keys( file + '*', function( err, keys ) {
        if( keys.length > 0 ) {
          matchingKeys[ host.join( ':' ) ] = keys;
        };

        async.each( keys, function( key, callback ) {
          var keyName = key.toString()
          redis.get( keyName, function( err, data ) {
            var dest = path.join( tmpDir, keyName ),
                chunk = fs.createWriteStream( dest );

            chunk.write( data );
            chunk.end();

            chunks.push( dest );

            callback();
          });
        }, function( err ) {
          callback();
        });
      });

    }, function( err ) {

      console.log( '-> Got these chunks', chunks );

      chunks = chunks.sort( function( a, b ) {
        var a = a.split( ':' )[1],
            b = b.split( ':' )[1];
           return a - b;
      });

      console.log( chunks );
    });

  };

};


module.exports = DRFS;
