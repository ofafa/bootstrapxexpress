/**
 * Created by s955281 on 10/21/15.
 */
var mongo = require('mongodb');

var settings = require('../settings'),
    Db = mongo.Db,
    Connection = mongo.Connection,
    Server = mongo.Server;

module.exports = new Db(settings.db, new Server(settings.host, settings.port),{safe: true});

