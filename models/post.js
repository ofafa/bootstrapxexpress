/**
 * Created by s955281 on 10/30/15.
 */
var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, title, post, tags){
    this.name = name;
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
        time: time,
        title: this.title,
        post: this.post,
        comments: [],
        pv: 0,
        tags: this.tags
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