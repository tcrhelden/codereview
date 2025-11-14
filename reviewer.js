import fs from "fs-extra";
import path from "path";
import openai from "./openaiClient.js";

function getLanguageByExt(ext) {
  const map = {".js":"JavaScript",".ts":"TypeScript",".py":"Python",".java":"Java",".cpp":"C++",".cs":"C#"};
  return map[ext] || "code";
}

export async function reviewAndFixFiles(filePaths, options={}) {
  const results=[];
  for(const filePath of filePaths){
    try{
      const code = await fs.readFile(filePath,"utf-8");
      const ext = path.extname(filePath);
      const language = getLanguageByExt(ext);

      const reviewPrompt = `
Je bent een ervaren ${language} software engineer. Analyseer de volgende code en geef een gestructureerde code review:
- Codekwaliteit
- Efficiëntie en prestaties
- Beveiliging en foutafhandeling
- Leesbaarheid en best practices
- Concrete verbeterpunten

Code:
\`\`\`
${code}
\`\`\`
`;
      const reviewResp = await openai.chat.completions.create({
        model:"gpt-4o-mini",
        messages:[{role:"user",content:reviewPrompt}],
        temperature:0.2,
        max_tokens:1200
      });
      const reviewText = reviewResp.choices[0].message.content;

      let fixedText=null;
      if(!options.noFix){
        const fixPrompt=`Je bent een ervaren ${language} developer. Verbeter de volgende code volledig volgens best practices en behoud functionaliteit:
\`\`\`
${code}
\`\`\`
`;
        const fixResp = await openai.chat.completions.create({
          model:"gpt-4o-mini",
          messages:[{role:"user",content:fixPrompt}],
          temperature:0.2,
          max_tokens:1500
        });
        fixedText = fixResp.choices[0].message.content;
        const codeBlockMatch = fixedText.match(/```(?:[\w+-]*)\n([\s\S]*?)```/);
        if(codeBlockMatch){fixedText=codeBlockMatch[1].trim();}
      }

      let fixedFilePath=null;
      if(fixedText){
        const base=path.basename(filePath,path.extname(filePath));
        fixedFilePath = path.join("./reviews", base+"_fixed"+ext);
        await fs.writeFile(fixedFilePath,fixedText,"utf-8");
      }

      results.push({file:filePath,review:reviewText,fixedFile:fixedFilePath});
    }catch(err){
      results.push({file:filePath,error:err.message});
    }
  }

  const timestamp=new Date().toISOString().replace(/[:.]/g,"-");
  const reportPath=path.join("./reviews",`review-report-${timestamp}.json`);
  await fs.writeFile(reportPath,JSON.stringify(results,null,2),"utf-8");
  return {results,reportPath};
}
