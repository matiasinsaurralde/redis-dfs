var fs = require( 'fs' ),
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
      self.uploadChunk( dest );
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

  this.uploadChunk = function(file) {
    // var redis = Redis.createClient();
    var host = this.hosts[ this.uploadIndex ].split( ':' ),
        redis = Redis.createClient( host[1], host[0] );

    console.log( '=> Using host', host[0], 'for', file );

    fs.readFile( file, function( err, data ) {
      console.log( 'redis.set', data );
      redis.set( file, data, function( err, reply ) {
        console.log( 'upload ok?', err, reply );
      });
    });

    this.uploadIndex++;
  };
};


module.exports = DRFS;
