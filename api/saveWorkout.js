let savedData = []; // tijdelijk geheugen (gaat verloren bij redeploy!)

export default function handler(req, res) {
  if (req.method === "POST") {
    const data = req.body;
    savedData.push(data); // voeg nieuwe data toe
    res.status(200).json({ message: "Data opgeslagen!", allData: savedData });
  } else if (req.method === "GET") {
    res.status(200).json({ allData: savedData });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
