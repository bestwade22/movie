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
                                                                    trimString:  function(passedString, startstring, endstring) {
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


app.use(require('cookie-parser')(credentials.cookieSecret));

// Defines the port to run on
app.set('port', process.env.PORT || 8080);
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

app.get('/fullmovie/:page', function(req, res){
  var lists = [];
  var page = parseInt(req.params.page);
  res.render('fullmovie',{nowpage:"Full Movies",movies:lists,position:"fullmovie",prevpage:(page-1),page:page,nextpage:(page+1)});

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