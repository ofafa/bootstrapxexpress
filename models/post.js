/**
 * Created by s955281 on 10/30/15.
 */
var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, title, post){
    this.name = name;
    this.title = title;
    this.post = post;
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
    }


    //document for saving
    var post = {
        name: this.name,
        time: time,
        title: this.title,
        post: this.post
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

Post.getAll = function(name, callback){
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
            collection.find(query).sort({
                time: -1
            }).toArray(function(err, docs){
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                docs.forEach(function(doc){
                   doc.post = markdown.toHTML(doc.post);
                });
                callback(null, docs); //success and return the results
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
                mongodb.close();
                if(err){
                    return callback(err);
                }
                doc.post = markdown.toHTML(doc.post);
                callback(null, doc);
            });

        });
    });
};