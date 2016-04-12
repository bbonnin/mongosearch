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
  var usedId = id;
  try {
    usedId = new ObjectId(id);
  }
  catch (e) {
    // Use the argument
  } 
  return this.findOne({ '_id' : usedId });
}

/**
 * @param elsEndpoint Elasticsearch URL (host:port/index/type)
 */
DBCollection.prototype.setElsEndpoint = function (elsEndpoint) {
  this.elsEndpoint = elsEndpoint;
}

DBCollection.prototype.getElsEndpoint = function () {
  if (!this.elsEndpoint) {
    var db = this.getDB();
    var collection = this.getName();
    var server = db.serverStatus().host.split('.')[0];
    server = server.substring(0, server.indexOf(':'));
    this.elsEndpoint = server + ':9200/' + db + '/' + collection; 
  }
  
  return this.elsEndpoint;
}

/**
 * Save a document in MongoDB and in Elasticsearch.
 *
 * @param doc Document to save
 * @param elsIndexedFields List of the fields to index in Elasticsearch (if null, all fields will be indexed)
 */
DBCollection.prototype.saveAndIndex = function (doc, elsDocFields) {
  
  var id = doc._id;
  if (!id) {
    id = new ObjectId();
    doc._id = id;
  }
  
  var mongoResult = this.save(doc);
  var result = { mongo: mongoResult };
  if (mongoResult.nUpserted == 1 || mongoResult.nModified == 1) {
    // Build the document to be inserted in Elasticsearch
    var elsDoc = {};
    if (elsDocFields) {
      elsDocFields.forEach(field => {
        elsDoc[field] = doc[field];
      });
    }
    else {
      elsDoc = doc;
    }
    elsDoc._search_id = id.valueOf();
    
    var outputFile = '/tmp/mongosearch-' + new ObjectId().toString();
    var progResult = runProgram('curl', this.getElsEndpoint() + '/' + doc._id, '-s', '-XPUT',
      '-o', outputFile, '-d', JSON.stringify(elsDoc));
    
    var elsResult = {};
    elsResult.error = progResult !== 0;
    elsResult.progStatus = progResult;
    try {
      elsResult.output = JSON.parse(cat(outputFile));
      elsResult.error = elsResult.output ? elsResult.output.error !== undefined : false;
    }
    catch (e) {
      // No output file ?
    }
    
    result.elastic = elsResult;
    
    removeFile(outputFile);
  }
  
  return result;
}

/**
 * Search a document in Elasticsearch and return the associated documents found in MongoDB.
 *
 * @param query Elasticsearch query
 */
DBCollection.prototype.search = function (query) {

  var outputFile = '/tmp/mongosearch-' + new ObjectId().toString();
  var progResult = runProgram('curl', this.getElsEndpoint() + '/_search', '-s', '-XPOST',
    '-o', outputFile, '-d', JSON.stringify(query));
  var result = undefined;
  
  if (progResult === 0) {
    var output = cat(outputFile);
    var searchResult = JSON.parse(output);
    result = [];
    
    searchResult.hits.hits.forEach((hit, i) => {
      var doc = this.get(hit._source._search_id);
      if (doc) {
        result.push(doc);
      }
    });
  }
  else {
    result = {};
    result.error = true;
    result.progStatus = progResult;
  }
  
  //removeFile(outputFile);
  
  return result;
}
