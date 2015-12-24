/**
 * Created by s955281 on 10/22/15.
 */
var mongodb = require('./db');
var crypto = require('crypto');

function User(user) {
    this.name = user.name;
    this.password = user.password;
    this.email = user.email;
}

module.exports = User;

User.prototype.save = function(callback){
    //user profiles for saving
    var md5 = crypto.createHash('md5'),
        email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
        head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";//s=size

    var user = {
        name: this.name,
        password: this.password,
        email: this.email,
        head: head
    };

    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //read user collection
        db.collection('users', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            //insert user data
            collection.insert(user, {safe: true}, function(err, user){
                mongodb.close();
                if(err){return callback(err);}
                callback(null, user[0]);

            });
        });
    });

};

User.get = function(name, callback){
    //connect to db
    mongodb.open(function(err, db){
        if(err){
            return callback(err);
        }
        db.collection('users', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                name: name}, function(err, user){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null, user);
            });
        });
    });
};

User.update = function(name, password, email, head, callback){
    mongodb.open(function(err, db){
        if(err){
            return callback(err);
        }
        db.collection('users', function(err, collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            //update pwd and email
            if(password!="" && email != ""){
                this.checkPassword(password, function(err, callback){
                    if(err){
                        mongodb.close();
                        return callback(err);
                    }
                    collection.update({"name":name}, {$set:{"password":password, "email":email}}, function(err){
                        if(err){
                            mongodb.close();
                            return callback(err);
                        }

                    });
                });
            }
            if(head){
                collection.update({"name":name}, {$set:{head:head}}, function(err){
                    if(err){
                        mongodb.close();
                        return callback(err);
                    }
                    mongodb.close();
                    callback(null);
                });
            }
        });
    });
};

User.checkPassword = function (password, callback){
    if(password == this.password){
        return callback('same password');
    }
    return true;
};