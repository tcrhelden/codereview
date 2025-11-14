import express from "express";
import multer from "multer";
import path from "path";
import { reviewAndFixFiles } from "./reviewer.js";

const app = express();
const upload = multer({ dest: "./uploads/" });

app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));

app.get("/", (req,res)=>{res.render("index",{results:null});});

app.post("/upload", upload.array("files",20), async (req,res)=>{
  if(!req.files || req.files.length===0) return res.send("Geen bestanden geüpload.");

  const filePaths = req.files.map(f=>f.path);
  const {results, reportPath} = await reviewAndFixFiles(filePaths,{noFix:false});
  res.render("index",{results,reportPath});
});

app.listen(3000,()=>{console.log("Server gestart op http://localhost:3000");});