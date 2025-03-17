"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

export default function BranchPage() {
  const { id } = useParams(); // URL'deki branch id'sini alıyoruz
  const [expenses, setExpenses] = useState("");
  const [earnings, setEarnings] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(new Date());
  const [message, setMessage] = useState("");
  const [financialData, setFinancialData] = useState<any[]>([]);

  // Şubenin finansal özetlerini GET ile çekiyoruz
  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const res = await fetch(`/api/branch/${id}`);
      const data = await res.json();
      setFinancialData(data);
    }
    fetchData();
  }, [id]);

  // Form submit ile POST isteği gönderiyoruz
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const payload = {
      expenses,
      earnings,
      summary,
      date: date.toISOString().split("T")[0], // YYYY-MM-DD formatı
    };

    const res = await fetch(`/api/branch/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setMessage("Data saved successfully!");
      // Listeleri güncellemek için yeniden verileri çekelim
      const newRes = await fetch(`/api/branch/${id}`);
      const newData = await newRes.json();
      setFinancialData(newData);
    } else {
      const error = await res.json();
      setMessage(`Error: ${error.error}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Branch Financial Summary</h2>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => setDate(newDate || new Date())}
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="number"
              placeholder="Expenses"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Earnings"
              value={earnings}
              onChange={(e) => setEarnings(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Save
            </Button>
          </form>
          {message && <p>{message}</p>}
        </CardContent>
      </Card>
      {/* Mevcut özetleri listeleyelim */}
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2">Existing Summaries</h3>
        <ul>
          {financialData.map((item) => (
            <li key={item.id} className="border p-2 mb-2">
              <p>Date: {item.date}</p>
              <p>Expenses: {item.expenses}</p>
              <p>Earnings: {item.earnings}</p>
              <p>Summary: {item.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
