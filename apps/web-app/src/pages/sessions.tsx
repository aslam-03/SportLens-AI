import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/layouts/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

export default function Sessions() {
  const [sessions] = useState([
    {
      id: '1',
      date: '2024-01-15',
      sport: 'Cricket',
      duration: '45 mins',
      type: 'Batting',
      status: 'completed',
    },
    {
      id: '2',
      date: '2024-01-14',
      sport: 'Cricket',
      duration: '60 mins',
      type: 'Bowling',
      status: 'completed',
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
          <h1 className="text-3xl font-bold mb-8">Session History</h1>

          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="p-6" hoverable>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{session.sport}</h3>
                    <p className="text-text-secondary text-sm mb-2">
                      {new Date(session.date).toLocaleDateString()} • {session.duration}
                    </p>
                    <Badge variant="default" size="sm">
                      {session.type}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Icon name="play" size="md" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
