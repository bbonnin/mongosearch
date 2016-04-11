/*
 * mongosearch
 * MongoDB shell extension for using the best of MongoDB and Elasticsearch at the same time
 *
 * Bruno Bonnin - 2016
 *
 * https://github.com/bbonnin/mongosearch
 */

/**
 * Find a document by id
 */
DBCollection.prototype.get = function (id) {    
  return this.findOne({'_id' : id});
}

/**
 * @param elsEndpoint Elasticsearch URL (host:port/index/type)
 */
DBCollection.prototype.setElsEndpoint = function (elsEndpoint) {
  this.elsEndpoint = elsEndpoint;
}

DBCollection.prototype.getElsEndpoint = function () {
  if (!this.elsEndpoint) {
    var server = db.serverStatus().host.split('.')[0];
    server = server.substring(0, server.indexOf(':'));
    this.elsEndpoint = server + ':9200/' + db + '/' + collection; 
  }
  
  return this.elsEndpoint;
}

/**
 * Insert a document in MongoDB and in Elasticsearch.
 *
 * @param doc Document to insert
 */
DBCollection.prototype.index = function (doc, elsIndexedFields) {
  
  var id = doc._id;
  if (!id) {
    id = new ObjectId();
    doc._id = id;
  }
  
  var res = this.insert(doc);
  
  if (res.nInserted == 1) {
    // Build the document to be inserted in Elasticsearch
    var elsDoc = doc;
    elsIndexedFields.forEach(field => {
      delete elsDoc[field];
    });
    
    var progResult = runProgram('curl', this.getElsEndpoint() + '/' + doc._id, '-s', '-XPOST', '-d', elsDoc);
    
    if (progResult !== 0) {
      res = {};
      res.error = true;
      res.message = 'Program exit status: ' + progResult;
    }
  }
  
  return res;
}

/**
 * Search a document in Elasticsearch and return the associated documents found in MongoDB.
 *
 * @param query Elasticsearch query
 */
DBCollection.prototype.search = function (query) {

  var db = this.getDB();
  var collection = this.getName();
  var outputFile = '/tmp/mongosearch-' + new ObjectId().toString();
  var progResult = runProgram('curl', this.getElsEndpoint() + '/_search', '-s', '-o', outputFile);
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
