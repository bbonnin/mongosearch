
DBCollection.prototype.get = function (id, projection) {    
    return this.findOne({'_id' : id});
}

DBCollection.prototype.search = function (query, docTypeEndpoint) {

  var db = this.getDB();
  var collection = this.getName();
  var server = db.serverStatus().host.split('.')[0];
  server = server.substring(0, server.indexOf(':'));
  var endpoint = docTypeEndpoint || server + ':9200/' + db + '/' + collection; 
  var outputFile = '/tmp/mongosearch-' + new ObjectId().toString();
  
  var progResult = runProgram('curl', endpoint + '/_search', '-s', '-o', outputFile);
  var result = undefined;
  
  if (progResult === 0) {
    var output = cat(outputFile);
    var searchResult = JSON.parse(output);
    result = [];
    
    searchResult.hits.hits.forEach((hit, i) => {
      var doc = this.get(hit._id);
      if (doc) {
        result.push(doc);
      }
    });
  }
  else {
    result = {};
    result.error = true;
    result.message = 'Program exit status: ' + progResult;
  }
  
  removeFile(outputFile);
  
  return result;
}
