# mongosearch
MongoDB shell extension to send elasticsearch queries and use the result to get the associated documents in MongoDB

## Purpose
The goal of this extension is to provide an easy way (i.e. using one command) to :
* insert documents in MongoDB and to index these documents (only the fields you will use for your search queries) in Elasticsearch

<center>
  <img alt="save and index" src="/docs/insert.png" width="636" height="180"/>
</center>

* search in Elasticsearch and return the associated document stored in MongoDB

<center>
  <img alt="search" src="/docs/search.png" width="648" height="193"/>
</center>


Important:
* The script uses `curl` for requesting Elasticsearch: this tool must be in your path or you can change the calls to `runProgram` 
* The same id will be used in MongoDB and Elastisearch
  * it will be stored in a field named `_mongo_id` in Elasticsearch
* By default (Elasticsearch / MongoDB):
  * index name = database name
  * document type name = collection name
  * elasticsearch host = mongod host

## How to use
* Download `mongosearch.js`
* Launch the mongo shell
* Load mongosearch
```
> load('/path/to/mongosearch.js')
```

Now, you have new methods for a collection:
* `saveAndIndex` : insert a document in MongoDB and index it in Elasticsearch
  * Arguments :
    * doc : document to insert
    * elsDocFields : fields to index in Elasticsearch (to avoid indexing the whole document)
  * Return : result of the action
* `search` : search documents. The search query is sent to Elasticsearch and the result is used to get the documents in MongoDB (using the `_mongo_id`)
  * Arguments :
    * query : Elasticsearch search query (see Elasticsearch documentation)
  * Return : documents
* `setElsEndpoint` : override the default URL to use for the Elasticsearch queries

## Examples
* Add new documents (only 2 fields are indexed in ELS):
```
> db.actors.saveAndIndex({first_name: 'Will', last_name: 'Smith', movies: ['Independance Day'], _id:1}, ['first_name', 'last_name'])

{
  "mongo": {
    "nMatched": 0,
    "nUpserted": 1,
    "nModified": 0,
    "_id": 1
  },
  "elastic": {
    "error": false,
    "progStatus": 0,
    "output": {
      "_index": "cinema",
      "_type": "actors",
      "_id": "1",
      "_version": 1,
      "_shards": {
        "total": 2,
        "successful": 1,
        "failed": 0
      },
      "created": true
    }
  }
}

```

* use the `search` method
```
> db.actors.search({"query": {
    "multi_match" : {
        "query": "will smith",
        "fields": [ "first_name" ] 
     }
}})

[
  {
    "_id": 1,
    "first_name": "Will",
    "last_name": "Smith",
    "movies": [
      "Independance Day"
    ]
  }
]
```
