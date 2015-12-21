/**
 * Created by s955281 on 10/30/15.
 */
var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, head, title, post, tags){
    this.name = name;
    this.head = head;
    this.title = title;
    this.post = post;
    this.tags = tags;
}

module.exports = Post;

//Save function
Post.prototype.save = function(callback){
    var date = new Date();
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth()+1),
        day: date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate(),
        minute: date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":"
        + (date.getMilliseconds() < 10?'0'+date.getMinutes() : date.getMinutes())
    };


    //document for saving
    var post = {
        name: this.name,
        head: this.head,
        time: time,
        title: this.title,
        post: this.post,
        comments: [],
        pv: 0,
        tags: this.tags,
        reprint_info:{}
    };

    //connecting DB
    mongodb.open(function(err, db){
        if(err) {
            return callback(err);
        }
        //read posts
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            //insert post into the collection
            collection.insert(post, {safe: true}, function(err){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null);
            });
        });
    });

};

Post.getTen = function(name, page, callback){
    //opendb
    mongodb.open(function(err, db){
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                mongpdb.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //return specific document based on count
            collection.count(query, function(err, total){
                collection.find(query, {
                    skip: (page -1) * 10,
                    limit: 10
                }).sort({
                    time:-1
                }).toArray(function(err, docs){
                    mongodb.close();
                    if(err){
                        return callback(err);
                    }
                    docs.forEach(function(doc){
                        doc.post = markdown.toHTML(doc.post);
                    });
                    callback(null, docs, total); //success and return the results
                });
            });
        });
    });
};

Post.getOne = function(name, day, title, callback){
    //open database
    mongodb.open(function(err,db){
        if(err){
            return callback(error);
        }
        db.collection('posts', function(err, collection){
            if(err){
                console.log("open err");
                mongodb.close();
                return callback(error);
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function(err, doc){
                if(err){
                    mongodb.close();
                    return callback(err);
                }
                if(doc){
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {$inc:{ "pv" :1 }}, function(err){
                        mongodb.close();
                        if(err){
                            return callback(err);
                        }
                    });
                    doc.post = markdown.toHTML(doc.post);
                    doc.comments.forEach(function(comment){
                        comment.content = markdown.toHTML(comment.content);
                    });
                }
                callback(null, doc);
            });

        });
    });
};

//return the origin content in markdown format
Post.edit = function(name, day, title, callback){
    //open database
    mongodb.open(function(err, db){
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                name: name,
                "time.day": day,
                title: title
            }, function(err, doc){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null, doc);
            });
        });
    });
};

//modify the content for specific doc
Post.update = function(name, day, title, newtitle, post, callback){
    mongodb.open(function(err, db){
        if(err){
            mongodb.close();
            callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                callback(err);
            }
            //collection.update(query, update, options), $set=modifier
            collection.update({
                "name": name,
                "time.day": day,
                "title": title
            }, { $set: {title: newtitle, post: post}}, function(err){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

//remove a doc from the db collection
Post.remove = function(name, day, title, callback){
    mongodb.open(function(err, db){
        if(err){
            mongodb.close();
            callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                callback(err);
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function(err, post){
                if(err){
                    mongodb.close();
                    return callback(err);
                }
                console.log(post.reprint_info);
                if(post.reprint_info.reprint_from){
                    collection.update({
                        "name": post.reprint_info.reprint_from.name,
                        "time.day": post.reprint_info.reprint_from.day,
                        "title": post.reprint_info.reprint_from.title
                    }, {$pull:{
                        "reprint_info.reprint_to": {
                            "name": name,
                            "day": day,
                            "title": title
                        }}
                    }, function(err){
                        if(err){
                            mongodb.close();
                            return callback(err);
                        }
                    });
                }
                console.log('----');
                console.log(post.reprint_info);

                //collection.remove(query, justone, options), justone=true/false
                collection.remove({
                    "name": name,
                    "time.day": day,
                    "title": title
                }, { w: 1}, function(err){
                    mongodb.close();
                    if(err){
                        return callback(err);
                    }
                    callback(null);
                });
            });
        });
    });
};

Post.getArchive = function(callback){
    mongodb.open(function(err, db){
        if(err){
            return callback(err);
        }
        //get post collection
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            collection.find({}, {
                "name":1,
                "time":1,
                "title":1
            }).sort({
                time: -1
            }).toArray(function(err, docs){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

Post.getTags = function(callback){
    mongodb.open(function(err, db){
        if(err){
            mongodb.close();
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            collection.distinct('tags', function(err, docs){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

Post.getTag = function(tag, callback){
    mongodb.open(function(err, db){
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            collection.find({
                tags: tag
            }, {
                name: 1,
                time: 1,
                title: 1
            }).sort({
                time: -1
            }).toArray(function(err, docs){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });

};

Post.search = function(keyword, callback){
    mongodb.open(function(err, db){
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            var pattern = new RegExp(keyword, "i");
            collection.find({
                "post": pattern
            }, {
                name:1,
                time:1,
                title:1
            }).sort({
                time:-1
            }).toArray(function(err, docs){
                mongodb.close()
                if(err){
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};



Post.reprint = function(reprint_from, reprint_to, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                name: reprint_from.name,
                "time.day": reprint_from.day,
                "title": reprint_from.title
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                var date = new Date();
                var time = {
                    date: date,
                    year: date.getFullYear(),
                    month: date.getFullYear() + "-" + (date.getMonth() + 1),
                    day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
                    minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":"
                    + (date.getMilliseconds() < 10 ? '0' + date.getMinutes() : date.getMinutes())
                };
                delete doc._id;//Remove original ID
                doc.name = reprint_to.name;
                doc.head = reprint_to.head;
                doc.time = time;
                doc.title = (doc.title.search(/"[reprint]"/) > -1) ? doc.title : "[reprint]" + doc.title;
                doc.comment = [];
                doc.reprint_info = {"reprint_from": reprint_from};
                doc.pv = 0;

                //update the reprint_info in original doc
                collection.update({
                    "name": reprint_from.name,
                    "time.day": reprint_from.day,
                    "title": reprint_from.title
                }, {
                    $push: {"reprint_info.reprint_to":
                        {
                        "name": doc.name,
                        "day": time.day,
                        "title": doc.title
                        }
                    }
                }, function (err) {
                    if (err) {
                        mongodb.close();
                        return callback(err);
                    }
                });
                collection.insert(doc, {
                    safe: true
                }, function (err, post) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(err, post[0]);
                });
            });
        });

    });
};