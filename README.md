# mongosearch
MongoDB shell extension to send elasticsearch queries and use the result to get the associated documents in MongoDB

## How to use
* Download `mongosearch.js`
* Launch the mongo shell
* Load mongosearch
```
> load('/path/to/mongosearch.js')
true
```

Now, you have two new methods for a collection:
* `index` : to insert a document in MongoDB AND Elasticsearch
  * Arguments:
* `search` : to search for documents

## Examples
* Add new documents:
```
> db.users.index({name: 'Alice', age:30}, {name: 1})
> db.users.index({name: 'Bob', age:35}, {name: 1})
```

* use the `search` method
```
> db.users.search({name:'bob'})
```
