"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

export default function BranchPage() {
  const [expenses, setExpenses] = useState("");
  const [earnings, setEarnings] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(new Date());

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-lg w-full space-y-4 p-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-xl font-semibold">Branch Financial Summary</h2>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => setDate(newDate || new Date())}
            />
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
            <Button className="w-full">Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
