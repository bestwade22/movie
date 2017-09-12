//https://www.youtube.com/watch?v=xDCKcNBFsuI
//http://ec2-52-77-208-252.ap-southeast-1.compute.amazonaws.com:3000/


var express = require('express');
 
var app = express();

app.disable('x-powered-by');
// Set up Handlebars
// Create a directory named views and then another named layouts
// in it
// Define main.handlebars as the default layout
// Create these files in the views directory and define the
// HTML in them home.handlebars, about.handlebars,
// 404.handlebars and 500.handlebars
var handlebars = require('express-handlebars').create({defaultLayout:'main',
                                                       helpers: {
                                                                    trimString:  function(passedString, startstring, endstring){
                                                                         var theString = passedString.substring( startstring, endstring );
                                                                         return theString;
                                                                      }

                                                                }
                                                      });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// Required when using POST to parse encoded data
// npm install --save body-parser
app.use(require('body-parser').urlencoded({extended: true}));
 
// Formidable is required to accept file uploads
// npm install --save formidable
var formidable = require('formidable');
 
// Import credentials which are used for secure cookies
// Install the cookie middleware
// npm install --save cookie-parser
var credentials = require('./credentials.js');

//install moviedb
const MovieDB = require('moviedb')('5f3fde20bd486e81a18ffb9e0bbd0604');


var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://127.0.0.1:27017/moviedb'

app.use(require('cookie-parser')(credentials.cookieSecret));

// Defines the port to run on
app.set('port', process.env.PORT || 3000);
// when it receives a request
app.use(express.static(__dirname + 'public'));
app.get('/', function(req, res){
  var lists = [];
  MovieDB.discoverMovie({ }, (err, respon) => {
    lists = respon.results; 
    
    res.render('home',{nowpage:"Home",movies:lists,position:"discover",page:1,nextpage:2});
  });
  // Point at the home.handlebars view
});
app.get('/discover/:page', function(req, res){
  var lists = [];
  var page = parseInt(req.params.page);
  //var prevbtn = false;
  MovieDB.discoverMovie({page:page }, (err, respon) => {
    lists = respon.results; 
    //if (page>1) prevbtn = true;
    res.render('home',{nowpage:"Discover",movies:lists,position:"discover",prevpage:(page-1),page:page,nextpage:(page+1)});
  });
  // Point at the home.handlebars view
 
 
});
app.get('/coming/:page', function(req, res){
  var lists = [];
  var page = parseInt(req.params.page);
  //var prevbtn = false;
  MovieDB.miscUpcomingMovies({page:page }, (err, respon) => {
    lists = respon.results; 
    if (page>=parseInt(respon.total_pages)) {nextpage = 0} else {nextpage = page+1;}
    res.render('home',{nowpage:"Coming Soon",movies:lists,position:"coming",prevpage:(page-1),page:page,nextpage:nextpage,date:true});
  });
  // Point at the home.handlebars view
});
app.get('/playing/:page', function(req, res){
  var lists = [];
  var page = parseInt(req.params.page);
  //var prevbtn = false;
  MovieDB.miscNowPlayingMovies({page:page }, (err, respon) => {
    lists = respon.results; 
    if (page>=parseInt(respon.total_pages)) {nextpage = 0} else {nextpage = page+1;}
    res.render('home',{nowpage:"Now Playing",movies:lists,position:"playing",prevpage:(page-1),page:page,nextpage:nextpage});
  });
  // Point at the home.handlebars view
});
app.get('/movie/:id', function(req, res){
  var detail = [];
  var credits = [];
  var id = req.params.id;
  MovieDB.movieInfo({id:id }, (err, respon) => {
    detail = respon;
    MovieDB.movieCredits({id:id }, (err, respons) => {
      credits = respons;
      MovieDB.movieReviews({id:id }, (err, response) => {
        reviews = response.results;
        MovieDB.movieTrailers({id:id }, (err, respo) => {
          trailers = respo.youtube;
          var directors = [];
          var writers = [];
          var cast = [];
          credits.crew.forEach(function(entry){
           if (entry.job === 'Director') {
              directors.push(entry.name);
           }else if (entry.job === 'Writer'||entry.job === 'Screenplay') {
              writers.push(entry.name);
           }
          })
          credits.cast.forEach(function(entry){
           if (entry.order <= 4) {
              cast.push(entry.name);
           }
          })
          res.render('movie',{nowpage:detail.title,detail:detail,
                              director: directors.join(', '),
                              writer: writers.join(', '),
                             cast: cast.join(', '),
                             reviews:reviews,
                             trailers:trailers});
          });
       });
    });
  });
  // Point at the home.handlebars view
});

app.get('/fullmovies/:page', function(req, res){
  var lists = [];
  var page = parseInt(req.params.page);
      MongoClient.connect(url,function(err,db){
        if(err){
          msg = "Unable to connect to the server";
        }else{
          var collection = db.collection('movies');
          collection.aggregate([{$sort:{"insert_time":-1}},
                               { $group: { _id: null, count: { $sum: 1 } ,movies :{'$push':{'id':'$id','original_title':'$original_title','poster_path':'$poster_path','release_date':'$release_date','backdrop_path':'$backdrop_path','insert_time':'$insert_time'} } }},
            {$project:{'_id':false,"count":true, movies:{ $slice: [ "$movies", page*7-7,7 ]}}}
                               
            //,{$project:{"movies.id":true}}'$$ROOT'
                               //{$limit:7},{$skip:(7)}
                               ]).toArray(function(err,result){
            if(err){
              console.log(err)
              msg = err;
            }else if(result[0].count){//result[0].count
              console.log(result[0].movies[0]);
              msg="success";
              total_page = Math.ceil(result[0].count / 7);
              
              if (page>=total_page) {nextpage = 0} else {nextpage = page+1;}
              res.render('fullmovies',{nowpage:"Full Movies",movies:result[0].movies,position:"fullmovies",prevpage:(page-1),page:page,nextpage:nextpage, msg : msg});
            }
            db.close();
          })
        }

      });

});
app.get('/theater/:id', function(req, res){
  var movie = [];
  var id = parseInt(req.params.id);
  
   MongoClient.connect(url,function(err,db){
        if(err){
          console.log("connect err"+err);
        }else{
          var collection = db.collection('movies');
          collection.aggregate([
            {$match:{"id":id}}
          ]).toArray(function(err,result){
            if(err){
              console.log("collection err"+err);
            }else if(result.length){
              res.render('theater',{nowpage:result[0].title,movie:result[0]});
            }
            db.close();
          });
        }
   });
  

});

app.post('/search/submit',function(req,res){
 
  keyword = req.body.moviefield;
 
    res.redirect("/search/"+keyword+"/1");
 
})
//search functioin
app.get('/search/:keyword/:page',function(req,res){
  var lists = [];
  var page = parseInt(req.params.page);
  keyword = req.params.keyword;
  MovieDB.searchMovie({query:keyword ,page:page}, (err, respon) => {
    lists = respon.results;
    if (page>=parseInt(respon.total_pages)) {nextpage = 0} else {nextpage = page+1;}
    res.render('home',{nowpage:"search: "+keyword,movies:lists,position:"search/"+keyword,prevpage:(page-1),page:page,nextpage:nextpage});
  })
})

app.get('/insert',function(req,res){
  var lists = [];

    MongoClient.connect(url,function(err,db){
      if(err){
        error_msg = "Unable to connect to the server";
      }else{
        var collection = db.collection('movies');
        collection.find({}).sort({"insert_time": -1}).limit(7).toArray(function(err,result){
          if(err){
            error_msg = err;
          }else if(result.length){
            res.render('insert',{nowpage:"Insert",movies:lists,position:"Insert",prevpage:1,page:1,nextpage:1,query : req.query,db:result});
          }
          db.close();
        })
      }
      
    });
    

})

app.post('/insert/submit',function(req,res){
 
  //console.log(req.body);
  imdbId = req.body.imdbid;
 MovieDB.find({id:imdbId ,external_source:"imdb_id"}, (err, respon) => {
   
   if(err){
     res.redirect(303, '/insert?message='+err);
   }else{
      movie = respon.movie_results[0]
      id = movie.id;
      //console.log(movie);
      MovieDB.movieInfo({id:id }, (err, respon) => {
        detail = [];
        detail.push(respon);
        MovieDB.movieCredits({id:id }, (err, respons) => {
          credits = respons;
          MovieDB.movieReviews({id:id }, (err, response) => {
            reviews = response.results;
            MovieDB.movieTrailers({id:id }, (err, respo) => {
              trailers = respo.youtube;
              var directors = [];
              var writers = [];
              var cast = [];
              credits.crew.forEach(function(entry){
               if (entry.job === 'Director') {
                  directors.push(entry.name);
               }else if (entry.job === 'Writer'||entry.job === 'Screenplay') {
                  writers.push(entry.name);
               }
              })
              credits.cast.forEach(function(entry){
               if (entry.order <= 4) {
                  cast.push(entry.name);
               }
              })
        
              detail[0].directors=directors;
              detail[0].writers=writers;
              detail[0].cast=cast;
              detail[0].reviews=reviews;
              detail[0].trailers=trailers;
              detail[0].movie_link=req.body.link;
              detail[0].imdbid=imdbId;
              detail[0].insert_time = new Date();
              console.log(detail[0]);
             
              MongoClient.connect(url,function(err,db){
                if(err){
                  error_msg = "Unable to connect to the server";
                  db.close();
                }else{
                  var collection = db.collection('movies');
                  
                  collection.find({"imdbid":imdbId}).toArray(function(error,result){
                    if(result.length){
                        collection.update({"imdbid":imdbId},{$set:{"movie_link":req.body.link}},function (err, result) {
                            if (err) throw err;
                            res.redirect('/insert?message=finish update: '+movie.original_title);
                         });
                    }else{
                       collection.insert(detail[0],function(error,resu){
                          res.redirect('/insert?message=finish insert: '+movie.original_title);
                          db.close();
                        });
                    }
                    
                  })
                  
                 
                }
                
              });
              
              });
           });
        });
      });
      
   }
  })
})/**/

app.post('/delete',function(req,res){
  
  MongoClient.connect(url,function(error,db){
    var collection = db.collection('movies');
    collection.remove({"id":parseInt(req.body.id)},function(err,result){
         if (err) {
                  console.log('errrrrrrrrrror:'+err);
              }
              db.close();
         res.status(200).json({'msg':'success'})   
    });
  });
})

app.post('/getmovies',function(req,res){
  
  MongoClient.connect(url,function(error,db){
    var collection = db.collection('movies');
    collection.find({}).limit(7).sort({"insert_time": -1}).skip(parseInt(req.body.page)*7-7).toArray(function(err,result){
         if (err) {
                  console.log(err);
              }
              db.close();
          //console.log(result);
         res.status(200).json({'movies':result})   
    });
  });
})

app.get('/about', function(req, res){
  res.render('about');
});
app.get('/contact', function(req, res){
  res.render('contact',{csrf:"CSRF token"});
});
app.get('/thankyou', function(req, res){
  res.render('thankyou');
});
app.post('/process',function(req,res){
  console.log('Form : ' + req.query.form);
  console.log('CSRF token : ' + req.body._csrf);
  console.log('Email : ' + req.body.email);
  console.log('Question : ' + req.body.ques);
  res.redirect(303, '/thankyou');
})


app.get('/file-upload',function(req,res){
  var now = new Date();
  res.render('file-upload',{year:now.getFullYear(),month:now.getMonth()});
});
app.post('/file-upload/:year/:month',function(req,res){
  var form = new formidable.IncomingForm();
  form.parse(req,function(err,fields,file){
    if(err)
      return res.redirect(303,'/error');
    console.log("recive file");
    console.log(file);
    res.redirect(303,'/thankyou');
  });
});

// Defines a custom 404 Page and we use app.use because
// the request didn't match a route (Must follow the routes)
app.use(function(req, res) {
  // Define the content type
  res.type('text/html');
 
  // The default status is 200
  res.status(404);
 
  // Point at the 404.handlebars view
  res.render('404');
});
 
// Custom 500 Page
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500);
 
  // Point at the 500.handlebars view
  res.render('500');
});
app.listen(app.get('port'),function(){

  console.log("express started");
});