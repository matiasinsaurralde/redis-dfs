var fs = require('fs'),
  zlib = require('zlib');
  gzip = zlib.createGzip(),
  chunkingStreams = require('chunking-streams'),
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

  this.addHost = function(host) {
    console.log('+host', host);
  };

  this.addHosts = function(hosts) {
    var self = this;
    hosts.forEach(function(e) {
      self.addHost(e);
    });
  };

  this.put = function(file, callback) {

    var readableStream = fs.createReadStream(file),
        chunker = new SizeChunker({
          chunkSize: defaultChunkSize,
          flushTail: true
        }),
        output;

    chunker.on('chunkStart', function(id, done) {
      console.log( '-> Writing chunk', id );
      var dest = path.join( tmpDir, id + '.gz' );
      output = fs.createWriteStream( dest );
      done();
    });

    chunker.on('chunkEnd', function(id, done) {
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
  this.uploadFragment = function(file) {
    console.log('-> upload', file);
  };
};


module.exports = DRFS;
