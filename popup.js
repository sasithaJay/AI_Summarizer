document.getElementById("summarize").addEventListener("click", () => {
    const resultDiv = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;

    resultDiv.innerHTML = '<div class = "loader"></div>';

    chrome.storage.sync.get(["geminiApiKey"], ({geminiApiKey}) => {
        if(!geminiApiKey){
            resultDiv.textContent = "No Api key set. Click the gear icon to add one";
            return;
        }

        chrome.tabs.query({ative: true, currentWindow: true}, ([tab]) => {
        chrome.tabs.sendMessage(
            tab.id,
            {type: "GET_ARTICLE_TEXT"},
            async ({text}) => {
                if(!text){
                    resultDiv.textContent = "Couldn't find text from this page";
                    return;
                }
                try {
                    const summary = await getGeminiSummary(text, summaryType, geminiApiKey);
                    resultDiv.textContent = summary;
                } catch (error) {
                    resultDiv.textContent = "Gemini error: " + error.message;
                }
            }
        )
    })
    })   
});

async function getGeminiSummary(rawText, type, apiKey){
    const max = 20000;
    const text = rawText.length > max ? rawText.slice(0, max) + "...": rawText;

    const promptMap = {
        brief: `Summarizein 2-3 sentences:\n\n${text}`,
        detailed: `Give a detailed summary:\n\n${text}`,
        bullets: `Summarize in 5-7 bullets points (start each line with "_ "):\n\n${text}`
    };

    const prompt = promptMap[type] || promptMap.brief;

    const res = await fetch(
        `https://generativelanguage.googleapi.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,{
            method: "POST",
            header: {"Content-type": application/json},
            body: JSON.stringify({
                contents: [{parts: [{text: prompt}]}],
                generationConfig: {temperature: 0.2},
            }),
        }
    );

    if(!res.ok){
        const {error} = await res.json();
        throw new Error(error?.message || "Request failed");
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary.";
}