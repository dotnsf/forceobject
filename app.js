//. app.js
var express = require( 'express' ),
    app = express();

var PG = require( 'pg' );
PG.defaults.ssl = true;
var database_url = 'DATABASE_URL' in process.env ? process.env.DATABASE_URL : ''; 
var schema = '';
if( database_url.indexOf( '/' ) > -1 ){
  var tmp = database_url.split( '/' );
  schema = tmp[tmp.length-1];
}

var pg = null;
if( database_url ){
  console.log( 'database_url = ' + database_url );
  pg = new PG.Pool({
    connectionString: database_url,
    ssl: { require: true, rejectUnauthorized: false },
    idleTimeoutMillis: ( 3 * 86400 * 1000 )
  });
  pg.on( 'error', function( err ){
    console.log( 'error on working', err );
    if( err.code && err.code.startsWith( '5' ) ){
      try_reconnect( 1000 );
    }
  });
}

function try_reconnect( ts ){
  setTimeout( function(){
    console.log( 'reconnecting...' );
    pg = new PG.Pool({
      connectionString: database_url,
      ssl: { require: true, rejectUnauthorized: false },
      idleTimeoutMillis: ( 3 * 86400 * 1000 )
    });
    pg.on( 'error', function( err ){
      console.log( 'error on retry(' + ts + ')', err );
      if( err.code && err.code.startsWith( '5' ) ){
        ts = ( ts < 10000 ? ( ts + 1000 ) : ts );
        try_reconnect( ts );
      }
    });
  }, ts );
}


app.get( '/', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  try{
    var conn = await pg.connect();
    //var sql = 'select * from ' + schema + '.Torihikisaki__c';
    var sql = 'select * from ' + schema + '.Account';
    var query = { text: sql, values: [] };
    conn.query( query, function( err, result ){
      if( err ){
        console.log( err );
        res.status( 400 );
        res.write( JSON.stringify( err, null, 2 ) );
        res.end();
      }else{
        res.write( JSON.stringify( result, null, 2 ) );
        res.end();
      }
    });
  }catch( e ){
    console.log( e );
    res.status( 400 );
    res.write( JSON.stringify( e, null, 2 ) );
    res.end();
  }finally{
    if( conn ){
      conn.release();
    }
  }

});

var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
