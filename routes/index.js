var express = require('express');
var router = express.Router();
var session = require("express-session");
var MongoStore = require("connect-mongo")(session);
var settings = require('../settings');

var crypto = require('crypto');
var multer = require('multer');

User = require('../models/user');
Post = require('../models/post');
Comment = require('../models/comment');

router.use(session({
    secret: settings.cookieSecret,
    key: settings.db, //cookie name?
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 30}, //30 days
    store: new MongoStore({
        db: settings.db,
        host: settings.host,
        port: settings.port,
        auto_reconnect: true
    })
}));

router.use(multer({
    dest: './public/images',
    rename: function (fieldname, filename){
        return filename;
    }
}));




/* GET home page. */
router.get('/', function(req, res, next) {
    var page = req.query.p? parseInt(req.query.p): 1;
    Post.getTen(null, page, function(err, posts, total){
        if(err){
            posts = [];
        }
        res.render('index', {
            title: 'Home',
            user: req.session.user,
            posts: posts,
            page: page,
            isFirstPage: (page-1) == 0,
            isLastPage: ((page-1)*10 + posts.length)== total,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    })

});

router.post('/', function(req, res){
    console.log('submit search');
    var context = req.body['searchbar'];
    console.log('search: '+ context);

});


/* GET login page */
router.get('/login', function(req, res){
    res.render("login", {
        title: "Login",
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
    console.log("try to login");
});

/* POST login info*/
router.post('/login', function(req, res){
    console.log("user login");

    var loginUser = new User({
        name: req.body['username'],
        password: req.body['password']
    });

    console.log("user found");

    //Check if user is in db
    User.get(loginUser.name, function(err, user){
        //If user does not exist
        if(!user){
            req.flash('error', "User not exist");
            res.redirect('/login');
        }
        //Check password
        if(user){
            console.log("user exist!");
            var password = crypto.createHash('md5').update(loginUser.password).digest('hex');

            if (password == user.password){
                console.log("login successful!");
                req.session.user = user;
                req.flash('success','Login Successful!');
                res.redirect('/');
            }
            else{
                req.flash('error', "wrong password!");
                return res.redirect('login');
            }
        }

    });
});

/* GET registration page */
router.get('/reg', checkNotLogin);
router.get('/reg', function(req, res){
   res.render('reg', {
       title:'register',
       user: req.session.user,
       success: req.flash('success').toString(),
       error: req.flash('error').toString()
   });
   console.log("register new user");
});

/* POST registration data */
router.post('/reg', checkNotLogin);
router.post('/reg', function(req, res){
    var name = req.body['name'],
    password = req.body['password'],
    password_re = req.body['password-repeat'];
    if (password_re != password){
       req.flash('error', 'Inconsistent password, please re-enter!');
    return res.redirect('/reg');//return to registration page
    }
    //encrypt password
    var md5 = crypto.createHash('md5'),
    password = md5.update(req.body['password']).digest('hex');
    console.log(name, password, password_re);

    //create new user object
    var newUser = new User({
        name: req.body['name'],
        password: password,
        email: req.body['email']
    });

    //check if user is existing
    User.get(newUser.name, function(err, user){
        if(user){
            req.flash('error', 'user existing!');
            return res.redirect('/reg');
        }
        newUser.save(function(err, user){
            if(err){
                req.flash('error', err);
                return res.redirect('/reg');
            }
            req.session.user = user; //save user data into session
            req.flash('success', 'Signup successful!');
            console.log("create user: " + newUser.name);
            res.redirect('/');
        });
    });
});

router.get('/post', checkLogin);
router.get('/post', function(req, res){
    res.render('post',{
        title:'post',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });

});

router.post('/post', function(req, res){
    var currentUser = req.session.user,
        tags = [req.body.tag1, req.body.tag2, req.body.tag3],
        post = new Post(currentUser.name, currentUser.head, req.body['article_title'], req.body.context, tags);
    post.save(function(err){
        if(err){
            req.flash('error', err);
            return res.redirect('/');
        }
        req.flash('success', 'post successful!');
        res.redirect('/');
    });

});

router.get('/logout', function(req, res){
    req.session.user = null;
    req.flash('success', "Logout");
    res.redirect('/');
});

router.get('/upload', checkLogin);
router.get('/upload', function(req, res){
    res.render('upload', {
        title: 'upload file',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
});


router.post('/upload', checkLogin);
router.post('/upload', function(req, res){
    req.flash('success', 'upload successful!');
    res.redirect('/upload');
});


//fetch all the posts under a specific user
router.get('/u/:name', function(req, res){
    //check if user exists
    var page = req.query.p? parseInt(req.query.p):1;
    User.get(req.params.name, function(err, user){
        if(!user){
            req.flash('error', 'User not exist');
            return res.redirect('/');
        }
        Post.getTen(user.name, page, function(err, posts, total){
            if(err){
                req.flash('err', err);
                return res.redirect('/');
            }
            res.render('user', {
                title: user.name,
                posts: posts,
                page: page,
                isFirstPage: (page-1) == 0,
                isLastPage:((page-1) * 10 + posts.length) == total,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
});


//fetch exact one specific post from user/title/date
router.get('/u/:name/:day/:title', function(req, res){
    Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post){
        if(err){
            req.flash('error', 'post does not exist!');
            return res.redirect('/');
        }
        res.render('article',{
            title: req.params.title,
            post: post,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});

router.get('/edit/:name/:day/:title', function(req, res){
    var currentUser = req.session.user;
    Post.edit(currentUser.name, req.params.day, req.params.title, function(err, post){
        if(err){
            req.flash('error', err);
            res.redirect('back');
        }
        res.render('edit', {
            title: "edit",
            post: post,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

});

router.post('/edit/:name/:day/:title', checkLogin);
router.post('/edit/:name/:day/:title', function(req, res){
    var currentUser = req.session.user;
    Post.update(currentUser.name, req.params.day, req.params.title, req.body.title, req.body.post, function(err){
        var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.body.title);
        if(err){
            req.flash('err', err);
            return res.redirect(url);
        }
        req.flash('success', 'modify successfully!');
        res.redirect(url);
    });
});


//Remove post
router.get('/remove/:name/:day/:title', checkLogin);
router.get('/remove/:name/:day/:title', function(req, res){
    var currentUser = req.session.user;
    Post.remove(currentUser.name, req.params.day, req.params.title, function(err){
        if(err){
            req.flash('err', err);
            return res.redirect('back');
        }
        req.flash('success', 'remove article '+ req.params.title + ' successfully!');
        res.redirect('/');
    });
});


//post comments
router.post('/u/:name/:day/:title', function(req, res){
    var date = new Date();
    time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '' + date.getHours() + ':' + (date.getMinutes() < 10? '0' + date.getMinutes() : date.getMinutes());

    var md5 = crypto.createHash('md5'),
        email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
        head = "http://www.gravatar.com/avatar/" + email_MD5 + '?s=48'

    var comment = {
        name: req.body.name,
        head: head,
        email: req.body.email,
        website: req.body.website,
        time: time,
        content: req.body.content
    };

    var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
    newComment.save(function (err){
        if(err){
            req.flash('error', err);
            return res.redirece('back');
        }
        req.flash('success', 'comment left successfully!');
        res.redirect('back');
    });
});


router.get('/archive', function(req, res){
    Post.getArchive(function(err, posts){
        if(err){
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('archive',{
            title:'archive',
            posts:posts,
            user:req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});

router.get('/tags', function(req, res){
    Post.getTags(function(err, posts){
        if(err) {
            res.flash('error', err);
            return res.redirect('/');
        }
        res.render('tags', {
            title: 'tags',
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});

router.get('/tags/:tag', function(req, res){
    Post.getTag(req.params.tag, function(err, posts){
        if(err){
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('tag', {
            title: 'TAG:' + req.params.tag,
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()

        });
    });
});

router.get('/search', function(req, res){
    Post.search(req.query.keyword, function(err, posts){
        if(err){
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('search', {
            title: "SEARCH:" + req.query.keyword,
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});


router.get('/reprint/:name/:day/:title', checkLogin);
router.get('/reprint/:name/:day/:title', function(req, res){
    Post.edit(req.params.name, req.params.day, req.params.title, function(err, post){
        if(err){
            req.flash('error', err);
            return res.redirect('back');
        }
        var currentUser = req.session.user,
            reprint_from = {name: post.name, day: post.time.day, title: post.title},
            reprint_to   = {name: currentUser.name, head: currentUser.head};
        Post.reprint(reprint_from, reprint_to, function(err, post){
            if(err){
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', 'reprint successfully!');
            var url = encodeURI('/u/' + post.name + '/' + post.time.day + '/' + post.title);
            res.redirect(url);
        });
    });
});

router.use(function(req, res){
    res.render("404");
});




/* Utility function */
function checkLogin(req, res, next){
    if(!req.session.user){
        req.flash('error', 'Not login yet!');
        res.redirect('/login');
    }
    next();
}

function checkNotLogin(req, res, next){
    if(req.session.user){
        req.flash('error', 'already login!');
        res.redirect('back');
    }
    next();
}


module.exports = router;
