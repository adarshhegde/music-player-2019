const HTTP_PORT = 80,
    PUBLIC_ROOT = "public",
    fs = require("fs"),
    path = require("path"),
    express = require("express"),
    crypto = require("crypto"),
    serve = require("./template-engine"),
    bodyParser = require('body-parser');

const app = express();
app.set('json spaces', 40);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var purge = true; // false
process.argv.forEach((val, index, array) => {
    if (val == "purge") purge = true;
});

const indexer = new require("./indexer").scan("music");
const meta = new require("./m");
const MetaManager = new meta(indexer, purge);

function evalInContext(context, js) {

    var value;
  
    try {
      // for expressions
      value = eval('with(context) { ' + js + ' }');
    } catch (e) {
      if (e instanceof SyntaxError) {
        try {
          // for statements
          value = (new Function('with(this) { ' + js + ' }')).call(context);
        } catch (e) {}
      }
    }
  
    return value;
  }

var that = this;

startServer = () => {

    console.log(MetaManager.getTracksLength());

    let homepage = new serve("test.html", { root: PUBLIC_ROOT },
        {

        });



    app.get("/", (req, res) => homepage.gen(req, res));

    app.post("/run", (req, res)  => {
    
      try {
        res.send({data:eval(req.body.stuff),err:false})

      }  catch(err) {
        res.send({data:err.stack.toString(),err:true})
      }
      
      
    });

    app.use(express.static(path.join(__dirname, PUBLIC_ROOT)));
    app.listen(HTTP_PORT, () => console.log(`HTTP Server Listening on port ${HTTP_PORT}`))

};

MetaManager.start().then(startServer);