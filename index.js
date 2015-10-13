var fs = require('fs'),
  zlib = require('zlib');
  gzip = zlib.createGzip();
  chunkingStreams = require('chunking-streams');

const concurrentUploads = 2;

var LineCounter = chunkingStreams.LineCounter,
    SeparatorChunker = chunkingStreams.SeparatorChunker,
    SizeChunker = chunkingStreams.SizeChunker;

new SizeChunker({
  chunkSize: 1024, // must be a number greater than zero.
  flushTail: false // flush or not remainder of an incoming stream. Defaults to false
});

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
      chunkSize: 1024
    }),
    output;

    chunker.on('chunkStart', function(id, done) {
      console.log(id);
      output = fs.createWriteStream(id + '.gz');
      done();
    });

    chunker.on('chunkEnd', function(id, done) {
      output.end();
      done();
    });
    chunker.on('data', function(chunk) {
      output.write(chunk.data);
    });

    readableStream.pipe(gzip).pipe(chunker);

  };
  this.uploadFragment = function(file) {
    console.log('-> upload', file);
  };
};




module.exports = DRFS;
