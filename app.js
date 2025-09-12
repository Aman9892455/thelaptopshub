

if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const express = require('express');
const expressLayouts = require('express-ejs-layouts'); 
const path = require('path');
const mongoose=require('mongoose');
const LaptopListing=require("./model/laptopListing.js")
const methodOverride = require('method-override');
const cors = require('cors');


const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: "https://thelaptopshub.onrender.com",  // sirf frontend domain allow karo
  methods: ["GET", "POST"],                     // jo methods chahiye
  allowedHeaders: ["Content-Type"]              // jo headers chahiye
}));

app.use(express.json())

// app.options('/*any', cors(corsOptions));

app.use((req, res, next) => {
 res.header('Access-Control-Allow-Origin', 'https://thelaptopshub.onrender.com');
 res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
 res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
 if (req.method === 'OPTIONS') {
 return res.sendStatus(200);
 }
 next();
});


// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(methodOverride('_method'));



// Express EJS Layouts middleware (static files से पहले)
app.use(expressLayouts);
app.set('layout', 'layouts/boilerplate');

// Static files
app.use(express.static(path.join(__dirname, 'public')));









//mongodb atlas connection code  starts from here 
// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("✅ MongoDB Atlas se successfully connect ho gaya!");
})
.catch((error) => {
    console.error("❌ Connection failed:", error);
});






//schema validation

const laptopValidationSchema = require("./laptopValidationSchema");

function validateLaptop(req, res, next) {
  const { error } = laptopValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details.message });
  }
  next();
}


// function validateUser(req, res, next) {
//   const { error } = userValidationSchema.validate(req.body, { abortEarly: false }); // sab errors collect karne ke liye
//   if (error) {
//     // Joi ke sab error messages ko ek string me convert karo
//     const errorMessages = error.details.map(err => err.message).join(', ');
//     req.flash('error', errorMessages);
//     return res.redirect('/signup'); // ya jis page pe validation fail hota hai wahan redirect karo
//   }
//   next();
// }



// Required imports
// Required imports

const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');



const User = require('./model/user.js'); // Mongoose User model
const Joi = require('joi');



// Joi validation schema
// Joi validation schema for signup
const userValidationSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Name is required',
  }),
  email: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'Invalid email format',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.empty': 'Password is required',
  }),
  confirmPassword: Joi.any(),  // No validation for now just allow it through
});





// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// Make flash messages and current user accessible in all templates
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currUser = req.user || null;
  next();
});

// Passport local strategy configuration
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: 'Invalid credentials' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Invalid credentials' });
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Routes

// Login GET
app.get('/login', (req, res) => {
  res.render('pages/login', {
    message: req.flash('error'),
    hideNavbar: false,
    hideFooter: false
  });
});

// Login POST

const loginValidationSchema = Joi.object({
  
  email: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'Invalid email format',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.empty': 'Password is required',
  }),
});


function validateLogin(req, res, next) {
  const { error } = loginValidationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsgs = error.details.map(e => e.message).join(', ');
    req.flash('error', errorMsgs);
    return res.redirect('/login');
  }
  next();
}


app.post('/login',validateLogin, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info.message);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);

      if (user.isAdmin) {
        return res.redirect('/adminPanel');
      } else {
        return res.redirect('/home');
      }
    });
  })(req, res, next);
});


function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) return next();
  res.redirect('/login');
}

app.get('/adminPanel', isAdmin,async (req, res,next) => {
  try{
let laptopCount= await LaptopListing.countDocuments();

   res.render('pages/adminPanel', {
    user: req.user,
    title: 'admin panel',
     laptopCount,
    hideNavbar: false,   
    hideFooter: true    
  });}
  catch (error) {
    next(error);
  }
});


// Signup GET
app.get('/signup', (req, res,next) => {
  try{
  res.render('pages/signup', {
    message: req.flash('error'),
    hideNavbar: false,
    hideFooter: false
  });}
  catch (error) {
    next(error);
  }
});




//signup middleware
// Validate user middleware
// Validation Middleware
function validateUser(req, res, next) {
  const { error } = userValidationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsgs = error.details.map(e => e.message).join(', ');
    req.flash('error', errorMsgs);
    return res.redirect('/signup');
  }
  next();
}
// Signup POST

app.get('/signup', (req, res) => {
  res.render('pages/signup', {
    hideNavbar: false,
    hideFooter: false,
  });
});
app.post('/signup', validateUser, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/signup');
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error', 'User already exists with this email');
      return res.redirect('/signup');
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    req.login(user, err => {
      if (err) {
        req.flash('error', 'Auto login failed');
        return res.redirect('/login');
      }
      return res.redirect('/home');
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Server error during registration');
    res.redirect('/signup');
  }
});









// Logout
app.get('/logout', (req, res, next) => {
  
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/home');
  });
});

// Middleware to check authentication
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Protected profile route example
app.get('/profile', isLoggedIn, (req, res) => {
  res.render('profile', {
    user: req.user,
    hideNavbar: false,
    hideFooter: false
  });
});


//login code  ends here 





















//recieving data on email  starts from here


const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

// Middleware

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create transporter for nodemailer - 


// Email sending endpoint


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,  
    pass: process.env.GOOGLE_APP_PASSWORD   
  }
});

//

app.post('/send-email', async (req, res) => {
  try {
    const { first_name, last_name, email, mobile, subject, message } = req.body;

  
    if (!first_name || !last_name || !subject) {
      return res.status(400).json({ error: "First Name, Last Name और Subject जरूरी हैं।" });
    }

    const mailOptions = {
      from: `"FixedMyRent" <${process.env.EMAIL_USER}>`,
      to: 'amanv1871@gmail.com',  
      subject: `Inquiry from: ${first_name} ${last_name} - ${subject}`,
      html: `
        <h1>You have received a new inquiry</h1>
        <p><strong>First Name:</strong> ${first_name}</p>
        <p><strong>Last Name:</strong> ${last_name}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Thank You! Your enquiry has been sent successfully, You will be contacted soon." });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
});



//recieving  mail  ends here

























//forgot code starts from here 

const crypto = require('crypto');


app.get('/forgot-password', (req, res,next) => {
  try{
  res.render('pages/forgot-password', {
     message: req.flash('error'),
     hideNavbar: false,
    hideFooter: false
   });}
   catch (error) {
    next(error);
  }
});

app.post('/forgot-password', async (req, res) => {
  const email = req.body.email;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'User not found with that email');
      return res.redirect('/forgot-password');
    }

    // Token create karo
    const token = crypto.randomBytes(20).toString('hex');

    // Token aur expiry set karo
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Email bhejo
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Ya apka email service
       auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.GOOGLE_APP_PASSWORD // Your app password
    },
    });

    const resetURL = `http://${req.headers.host}/reset-password/${token}`;

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset Request',
      text: `You are receiving this because you (or someone else) requested a password reset.\nPlease click the following link to reset your password:\n\n${resetURL}\n\nIf you didn't request this, please ignore this email.\n`,
    };

    await transporter.sendMail(mailOptions);

    req.flash('success', 'Password reset email sent');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error sending password reset email. Try again later.');
    res.redirect('/forgot-password' );
  }
});

//forgot password code ends from here 

//forgot password  routes code starts from here 

app.get('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({ 
      resetPasswordToken: req.params.token, 
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      req.flash('error', 'Password reset token is invalid or expired.');
      return res.redirect('/forgot-password');
    }
    res.render('pages/reset-password', { token: req.params.token, message: req.flash('error') ,
          hideNavbar: false,   
    hideFooter: false 
    });
  } catch (err) {
    console.error(err);
    res.redirect('/forgot-password');
  }
});

//forgot password  routes code ends from here 

//forgot password post routes code starts from here 


app.post('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({ 
      resetPasswordToken: req.params.token, 
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or expired.');
      return res.redirect('/forgot-password');
    }

    if (req.body.password !== req.body.confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('back');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    req.flash('success', 'Password has been reset. You can now log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/forgot-password');
  }
});
//forgot password post routes code ends from here 










// Routes
app.get('/', async (req, res, next) => {
  try {
    let laptops = await LaptopListing.find({});
    res.render('pages/home', { 
      title: 'Home - The Laptop Hub',
      laptops,
      hideNavbar: false,
      hideFooter: false 
    });
  } catch (error) {
    next(error);
  }
});

app.get('/home', async (req, res,next) => {
  try{
    let laptops = await LaptopListing.find({})
  res.render('pages/home', { 
    title: 'Home - The Laptop Hub' ,
    laptops,
    
     hideNavbar: false,   
    hideFooter: false 
  });}
  catch (error) {
    next(error);
  }
});

app.get('/contact', (req, res,next) => {
  try{
  res.render('pages/contactUs', { 
    title: 'contact us',
     hideNavbar: false,   
    hideFooter: false 

  });}
  catch (error) {
    next(error);
  }
});

app.get('/aboutUs', (req, res,next) => {
  try{
  res.render('pages/aboutUs', { 
    title: 'about us',
     hideNavbar: false,   
    hideFooter: false 
  });}
  catch (error) {
    next(error);
  }
});


app.get('/getInTouch', (req, res,next) => {
  try{

  res.render('pages/getInTouch', { 
    title: 'get in touch us',
    hideNavbar: false,   
    hideFooter: false  

  });}
  catch (error) {
    next(error);
  }
});


// app.get('/adminPanel', async (req, res) => {

//  let laptopCount= await LaptopListing.countDocuments();
//  res.render('pages/adminPanel', {
//     title: 'admin panel',
//      laptopCount,
//     hideNavbar: false,   // yahan navbar hide ho jayega
//     hideFooter: true    // footer bhi hide ho jayega
//   });
// });



// Express route to render this template
app.get('/laptops', async (req, res,next) => {
    try {
        let laptops = await LaptopListing.find({}).lean();
        
        // Image URLs validate karo
        laptops = laptops.map(laptop => {
            if (!laptop.image || !isValidUrl(laptop.image)) {
                laptop.image = '/images/default-laptop.jpg';
            }
            return laptop;
        });
        
        res.render('pages/laptop-listings', { 
            laptops,
            title: 'Laptop Listings - TheLaptop Hub',
            hideNavbar: false,
            hideFooter: false,
            user:req.user
        });
    } catch (error) {
        console.error('Error:', error);
        next(error)
    }
});

// URL validation function
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}



















//laptop  listing code starts from here 

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;





// MongoDB Model import


// Cloudinary config
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUD_API_KEY, 
  api_secret: process.env.CLOUD_API_SECRET 
});

// Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'laptops',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => `${file.fieldname}-${Date.now()}`
  },
});
const parser = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// POST route to add new laptop
app.post('/laptops',isLoggedIn,validateLaptop, parser.single('laptopImage'), async (req, res) => {
  try {
    const imageUrl = req.file.path;  // Cloudinary URL

    const newLaptop = new LaptopListing({
      laptopName: req.body.laptopName,
      laptopBrand: req.body.laptopBrand,
      laptopPrice: req.body.laptopPrice,
      laptopCategory: req.body.laptopCategory,
      laptopDescription: req.body.laptopDescription,
      laptopProcessor: req.body.laptopProcessor,
      laptopRAM: req.body.laptopRAM,
      laptopStorage: req.body.laptopStorage,
      laptopGraphics: req.body.laptopGraphics,
      laptopDisplay: req.body.laptopDisplay,
      laptopOS: req.body.laptopOS,
      laptopImage: imageUrl,
      laptopImagePublicId: req.file.filename || req.file.public_id  // save public_id for deletion
    });

    await newLaptop.save();
    res.redirect('/laptops');
  } catch (err) {
    console.error("Listing save error:", err);
    res.status(500).send("Error saving laptop");
  }
});

// GET edit page route
app.get("/laptops/:id/edit", async (req, res) => {
  try {
    const { id } = req.params;
    const laptopDetails = await LaptopListing.findById(id);

    res.render("pages/edit", {
      laptopDetails,
      title: 'Admin Panel',
      hideNavbar: false,
      hideFooter: false
    });
  } catch (error) {
    console.error("Error fetching laptop details:", error);
    res.status(500).send("Error loading edit page");
  }
});

// PUT route to update laptop with image update
app.put('/laptops/:id',isLoggedIn,validateLaptop, parser.single('laptopImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const laptop = await LaptopListing.findById(id);

    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (laptop.laptopImagePublicId) {
        await cloudinary.uploader.destroy(laptop.laptopImagePublicId);
      }
      // Set new image URL and public_id
      updatedData.laptopImage = req.file.path;
      updatedData.laptopImagePublicId = req.file.filename || req.file.public_id;
    }

    await LaptopListing.findByIdAndUpdate(id, updatedData, { new: true });
    res.redirect('/laptops');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating laptop');
  }
});

//laptop listing code ends here 












// 1. 404 Not Found Handler (must come after all routes)
// app.all('*', (req, res, next) => {
//     res.send("page not found !")
// });


//delete route starts here
app.delete("/laptops/:id",isLoggedIn, async (req, res,next) => {
  try{
    let { id } = req.params;
    await LaptopListing.findByIdAndDelete(id);
    res.redirect("/laptops");}
    catch (error) {
    next(error);
  }
});

//delete route ends here
























// ==================== ROUTES END HERE ====================

// 1. 404 Handler - सभी routes के बाद
app.use('/*any', (req, res) => {
  res.status(404).render('pages/404', {
    title: 'Page Not Found',
    hideNavbar: false,
    hideFooter: false
  });
});

// 2. Global Error Handler - सबसे अंत में
app.use((err, req, res, next) => {
  // Log error
  console.error('ERROR:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Set default status code
  const statusCode = err.status || err.statusCode || 500;
  
  // Flash error message if available
  if (req.flash && err.message) {
    req.flash('error', err.message);
  }
  
  // For API requests, return JSON
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(statusCode).json({
      error: {
        message: statusCode === 500 ? 'Internal Server Error' : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  }
  
  // For HTML requests, render error page
  res.status(statusCode).render('pages/error', {
    title: 'Error',
    statusCode,
    message: statusCode === 500 ? 'Something went wrong. Please try again later.' : err.message,
    error: process.env.NODE_ENV === 'development' ? err : {},
    hideNavbar: false,
    hideFooter: false
  });
});

// 3. Process handlers for uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Close server & exit process
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

// ==================== SERVER START ====================
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
















