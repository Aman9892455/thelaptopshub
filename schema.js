// Top par yeh lines add karo
require('dotenv').config();










const express = require('express');
const expressLayouts = require('express-ejs-layouts'); // यह line add करें
const path = require('path');
const mongoose=require('mongoose');
const LaptopListing=require("./model/laptopListing.js")
const methodOverride = require('method-override');


const app = express();
const port = 3000;

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


function validateUser(req, res, next) {
  const { error } = userValidationSchema.validate(req.body, { abortEarly: false }); // sab errors collect karne ke liye
  if (error) {
    // Joi ke sab error messages ko ek string me convert karo
    const errorMessages = error.details.map(err => err.message).join(', ');
    req.flash('error', errorMessages);
    return res.redirect('/signup'); // ya jis page pe validation fail hota hai wahan redirect karo
  }
  next();
}



// Required imports
// Required imports

const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');



const User = require("./model/user.js"); // Mongoose User model

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true if HTTPS
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
app.post('/login',validateUser, (req, res, next) => {
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
    hideNavbar: false,   // yahan navbar hide ho jayega
    hideFooter: true    // footer bhi hide ho jayega
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

// Signup POST
app.post('/signup', async (req, res) => { try {
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


 req.login(user, (err) => {
 if (err) {
 req.flash('error', 'Error during auto login');
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

const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create transporter for nodemailer - यहाँ सही function name use करें
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.GOOGLE_APP_PASSWORD // Your app password
    }
});

// Email sending endpoint
app.post('/send-email', async (req, res,next) => {
    try {
        const { name, email, subject, message } = req.body;

        // Setup email data
        const mailOptions = {
            from: email,
            to: 'amanv1871@gmail.com',
            subject: `Contact Form: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Error sending email', error: error.message });
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
          hideNavbar: false,   // yahan navbar hide ho jayega
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
app.get('/', (req, res) => {
  res.send('Hello World!');
  
});

app.get('/home', async (req, res,next) => {
  try{
    let laptops = await LaptopListing.find({})
  res.render('pages/home', { 
    title: 'Home - The Laptop Hub' ,
    laptops,
    
     hideNavbar: false,   // yahan navbar hide ho jayega
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
     hideNavbar: false,   // yahan navbar hide ho jayega
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
     hideNavbar: false,   // yahan navbar hide ho jayega
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
    hideNavbar: false,   // yahan navbar hide ho jayega
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









//signup ejs code 




<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - The Laptop Hub</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            color: #333;
        } */
        
        .signup-container {
            width: 100%;
            max-width: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            margin: 0 auto;
        }
        
        .header {
            background: linear-gradient(135deg, #3494E6 0%, #3457D5 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-weight: 600;
            font-size: 28px;
            margin: 0;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .form-container {
            padding: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
            position: relative;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #444;
            font-size: 15px;
        }
        
        .form-group input {
            width: 100%;
            padding: 14px 15px 14px 45px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 15px;
            transition: all 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3494E6;
            box-shadow: 0 0 0 3px rgba(52, 148, 230, 0.2);
        }
        
        .input-icon {
            position: absolute;
            left: 15px;
            top: 40px;
            color: #3494E6;
            font-size: 18px;
        }
        
        .error {
            color: #e74c3c;
            font-size: 14px;
            margin-top: 5px;
            display: none;
        }
        
        .submit-button {
            background: linear-gradient(135deg, #3494E6 0%, #3457D5 100%);
            border: none;
            color: white;
            padding: 15px;
            border-radius: 6px;
            width: 100%;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        
        .submit-button:hover {
            background: linear-gradient(135deg, #3457D5 0%, #3494E6 100%);
            box-shadow: 0 5px 15px rgba(52, 87, 213, 0.3);
        }
        
        .login-link {
            text-align: center;
            margin-top: 25px;
            color: #666;
            font-size: 15px;
        }
        
        .login-link a {
            color: #3494E6;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }
        
        .login-link a:hover {
            color: #3457D5;
            text-decoration: underline;
        }
        
        .password-rules {
            background: #f8f9fa;
            border-left: 4px solid #3494E6;
            padding: 12px 15px;
            margin-top: 20px;
            border-radius: 4px;
            font-size: 14px;
            color: #555;
        }
        
        .password-rules ul {
            padding-left: 20px;
            margin: 8px 0 0 0;
        }
        
        .password-rules li {
            margin-bottom: 4px;
        }
        
        @media (max-width: 576px) {
            .container {
                border-radius: 10px;
            }
            
            .form-container {
                padding: 20px;
            }
            
            .header {
                padding: 25px 15px;
            }
            
            .header h1 {
                font-size: 24px;
            }
        }
        
        .logo {
            text-align: center;
            margin-bottom: 15px;
        }
        
        .logo i {
            font-size: 40px;
            color: #3494E6;
            background: rgba(52, 148, 230, 0.1);
            padding: 15px;
            border-radius: 50%;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="signup-container">
        <div class="header">
            <div class="logo">
                <i class="fas fa-laptop"></i>
            </div>
            <h1>Create Your Account</h1>
        </div>
        
        <div class="form-container">
            <form id="signupForm" action="/signup" method="POST">
                <div class="form-group">
                    <label for="name">Full Name</label>
                    <i class="fas fa-user input-icon"></i>
                    <input type="text" id="name" name="name" placeholder="Enter your full name" required>
                    <div class="error" id="nameError"></div>
                </div>
                
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <i class="fas fa-envelope input-icon"></i>
                    <input type="email" id="email" name="email" placeholder="Enter your email address" required>
                    <div class="error" id="emailError"></div>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <i class="fas fa-lock input-icon"></i>
                    <input type="password" id="password" name="password" placeholder="Create a strong password" required>
                    <div class="error" id="passwordError"></div>
                </div>
                
                <div class="form-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <i class="fas fa-lock input-icon"></i>
                    <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" required>
                    <div class="error" id="confirmPasswordError"></div>
                </div>
                
                <div class="password-rules">
                    <strong>Password must:</strong>
                    <ul>
                        <li>Be at least 6 characters long</li>
                        <li>Include letters and numbers</li>
                    </ul>
                </div>
                
                <button type="submit" class="submit-button">Create Account</button>
            </form>

            
            
            <div class="login-link">
                <p>Already have an account? <a href="/login">Login here</a></p>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            let isValid = true;
            
            // Clear previous errors
            document.querySelectorAll('.error').forEach(el => {
                el.style.display = 'none';
                el.textContent = '';
            });
            
            // Name validation
            const name = document.getElementById('name').value.trim();
            if (name.length < 2) {
                document.getElementById('nameError').textContent = 'Name must be at least 2 characters long';
                document.getElementById('nameError').style.display = 'block';
                isValid = false;
            }
            
            // Email validation
            const email = document.getElementById('email').value;
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                document.getElementById('emailError').textContent = 'Please enter a valid email address';
                document.getElementById('emailError').style.display = 'block';
                isValid = false;
            }
            
            // Password validation
            const password = document.getElementById('password').value;
            if (password.length < 6) {
                document.getElementById('passwordError').textContent = 'Password must be at least 6 characters long';
                document.getElementById('passwordError').style.display = 'block';
                isValid = false;
            }
            
            // Confirm password validation
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                document.getElementById('confirmPasswordError').style.display = 'block';
                isValid = false;
            }
            
            if (!isValid) {
                e.preventDefault();
            }
        });
    </script>
</body>
</html>