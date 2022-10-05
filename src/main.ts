import {attachMethod, createStripeCustomer, listCustomerPayMethods} from "./utils";
import 'dotenv/config';
import * as bodyParser from "body-parser";
import express = require("express");
import "reflect-metadata";
import {AppDataSource} from "./data-source";
import UserService from "./service/UserService";
import {User} from "./entity/User";

const app = express();
const cors = require("cors")
// establish database connection


app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json());
app.use(cors())
// app.use(express.static('public'));
const storeItems = new Map([
  [1, {priceInCents: 1000, name: 'Learn react'}],
  [2, {priceInCents: 2000, name: 'Learn node'}],
  [3, {priceInCents: 3000, name: 'Learn express'}],
])

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//create a checkout session and return the checkout url
//user use this url to process the payment then will be redirected to the success page
app.post('/create-checkout-session', async (req, res) => {
  console.log(req.body);
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.SERVER_URL}/success.html`,
      cancel_url: `${process.env.SERVER_URL}/cancel.html`,
      line_items: req.body.items.map(item => {
        const storeItem = storeItems.get(item.id);
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: storeItem.name,
            },
            unit_amount: storeItem.priceInCents,
          },
          quantity: item.quantity,
        }
      })
    })
    res.json({url: session.url})
  } catch (err) {
    console.log(err);
    res.status(500).json({error: err.message});
  }

})
//create a payment intent which set confirm to true
//this will process payment in backend then return the payment status
app.post("/payment", cors(), async (req, res) => {
  let {amount, id} = req.body
  try {
    const payment = await stripe.paymentIntents.create({
      amount,
      currency: "USD",
      description: "Test company",
      payment_method: id,
      confirm: true,

    })
    console.log("Payment", payment)
    res.json({
      message: "Payment successful",
      success: true
    })
  } catch (error) {
    console.log("Error", error)
    res.json({
      message: "Payment failed",
      success: false
    })
  }
})

/*** more complex and secure way to process payment in backend **/
// ref: https://betterprogramming.pub/complex-payment-flows-using-stripe-payment-intents-a-reactjs-nodejs-guide-5835f4c004cf
/*
* Payment process break down into 2 steps
* 1. Prepayment
* 2. Payment confirmation
* */


/*=================== prepayment ===================*/
app.post("/user/register", async (req, res) => {
  const {email, name, password, phone, username} = req.body;
  const userService = new UserService();
  /*  Add this user in your database and store stripe's customer id against the user   */
  try {
    const customer: any = await createStripeCustomer({email, name, phone});
    const newUser = new User();
    newUser.email = email;
    newUser.name = name;
    newUser.password = password;
    newUser.phone = phone;
    newUser.stripe_customer_id = customer.id;
    newUser.username = username;
    const savedUser = await userService.save(newUser);
    res.status(200).json(savedUser);
  } catch (err) {
    console.log(err);
    res.status(400).json({error: err?.message || "Error occurred"});
  }
});

app.post("/payment/method/attach", async (req, res) => {
  const { paymentMethod, customerId } = req.body;

  /* Fetch the Customer Id of current logged in user from the database */

  try {
    const method = await attachMethod({ paymentMethod, customerId });
    console.log(method);
    res.status(200).json({ message: "Payment method attached succesully" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Could not attach method" });
  }
});



app.get("/payment/methods", async (req, res) => {
  /* Query database to fetch Stripe Customer Id of current logged in user */
  const {customerId} = req.query;

  try {
    const paymentMethods = await listCustomerPayMethods(customerId);
    res.status(200).json(paymentMethods);
  } catch (err) {
    console.log(err);
    res.status(500).json("Could not get payment methods");
  }
});

app.post("/payment/create", async (req, res) => {
  const { paymentMethod, userCustomerId } = req.body;
  console.log(userCustomerId)
  /* Query database for getting the payment amount and customer id of the current logged in user */

  const amountInCents = 10 * 1000;
  const currency = "USD";

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      customer: userCustomerId,
      payment_method: paymentMethod,
      confirmation_method: "manual", // For 3D Security
      description: "Buy Product",
    });
    console.log(paymentIntent);
    /* Add the payment intent record to your datbase if required */
    res.status(200).json(paymentIntent);
  } catch (err) {
    console.log(err);
    res.status(500).json("Could not create payment");
  }
});

/* ---------------------------------------------------------------------- */

app.post("/payment/confirm", async (req, res) => {
  const { paymentIntent, paymentMethod } = req.body;
  try {
    const intent = await stripe.paymentIntents.confirm(paymentIntent, {
      payment_method: paymentMethod,
    });
    console.log("payemnt success", intent);
    /* Update the status of the payment to indicate confirmation */
    res.status(200).json(intent);
  } catch (err) {
    console.error(err);
    res.status(500).json("Could not confirm payment");
  }
});

AppDataSource
  .initialize()
  .then(() => {
    console.log("Data Source has been initialized!")
    app.listen(3000)
    console.log("Server has been started!")
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err)
    process.exit(1);
  })
