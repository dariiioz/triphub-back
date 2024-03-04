var express = require("express");
var router = express.Router();
const CountryInfo = require("../models/country-info");

router.post("/addCountry", async (req, res) => {
    const newCountry = new CountryInfo({
        country: "France",
    });

    const countrySaved = await newCountry.save();

    res.status(200).json({ result: true, data: countrySaved });
});

module.exports = router;
