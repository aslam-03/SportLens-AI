import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Reports() {
  const navigate = useNavigate();
  const [reports] = useState([
    {
      id: '1',
      title: 'Weekly Performance',
      date: '2024-01-15',
      improvement: '12%',
    },
    {
      id: '2',
      title: 'Monthly Stats',
      date: '2024-01-01',
      improvement: '8%',
    },
  ]);

  return (
    <AppShell>
      <div className="min-h-screen bg-navy-950 text-text-primary">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mx-auto px-4 py-8"
        >
          <h1 className="text-3xl font-bold mb-8">Performance Reports</h1>

          <div className="grid md:grid-cols-2 gap-6">
            {reports.map((report) => (
              <Card key={report.id} variant="elevated" className="p-6">
                <h3 className="text-lg font-semibold mb-4">{report.title}</h3>
                <p className="text-text-secondary text-sm mb-4">
                  {new Date(report.date).toLocaleDateString()}
                </p>
                <div className="text-3xl font-bold text-success-500 mb-6">
                  {report.improvement}
                </div>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
