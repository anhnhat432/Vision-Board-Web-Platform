import { useEffect, useState } from "react";
import { getUserData, UserData, addReflection, deleteReflection } from "../utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { BookOpen, Plus, Trash2, Calendar, Smile, Meh, Frown } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export function ReflectionJournal() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAddingReflection, setIsAddingReflection] = useState(false);
  const [newReflection, setNewReflection] = useState({
    title: '',
    content: '',
    mood: '',
    date: new Date().toISOString().split('T')[0],
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = () => {
    const data = getUserData();
    setUserData(data);
  };
  
  const handleAddReflection = () => {
    if (!newReflection.title || !newReflection.content) return;
    
    addReflection({
      title: newReflection.title,
      content: newReflection.content,
      mood: newReflection.mood,
      date: newReflection.date,
    });
    
    toast.success('Reflection saved!', {
      description: 'Your thoughts have been recorded in your journal.',
    });
    
    setNewReflection({
      title: '',
      content: '',
      mood: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsAddingReflection(false);
    loadData();
  };
  
  const handleDeleteReflection = (id: string) => {
    if (confirm('Are you sure you want to delete this reflection?')) {
      deleteReflection(id);
      loadData();
    }
  };
  
  const getMoodIcon = (mood?: string) => {
    switch (mood) {
      case 'happy':
        return <Smile className="w-5 h-5 text-green-500" />;
      case 'neutral':
        return <Meh className="w-5 h-5 text-yellow-500" />;
      case 'sad':
        return <Frown className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };
  
  if (!userData) return null;
  
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reflection Journal</h1>
          <p className="text-gray-600 mt-1">Document your journey, insights, and growth</p>
        </div>
        
        <Dialog open={isAddingReflection} onOpenChange={setIsAddingReflection}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              New Reflection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Write a Reflection</DialogTitle>
              <DialogDescription>
                Capture your thoughts, lessons learned, and personal insights
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newReflection.date}
                  onChange={(e) => setNewReflection({ ...newReflection, date: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g., A breakthrough moment, Lessons from today..."
                  value={newReflection.title}
                  onChange={(e) => setNewReflection({ ...newReflection, title: e.target.value })}
                />
              </div>
              
              <div>
                <Label>How are you feeling?</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={newReflection.mood === 'happy' ? 'default' : 'outline'}
                    className={newReflection.mood === 'happy' ? 'bg-green-500 hover:bg-green-600' : ''}
                    onClick={() => setNewReflection({ ...newReflection, mood: 'happy' })}
                  >
                    <Smile className="w-5 h-5 mr-2" />
                    Happy
                  </Button>
                  <Button
                    type="button"
                    variant={newReflection.mood === 'neutral' ? 'default' : 'outline'}
                    className={newReflection.mood === 'neutral' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    onClick={() => setNewReflection({ ...newReflection, mood: 'neutral' })}
                  >
                    <Meh className="w-5 h-5 mr-2" />
                    Neutral
                  </Button>
                  <Button
                    type="button"
                    variant={newReflection.mood === 'sad' ? 'default' : 'outline'}
                    className={newReflection.mood === 'sad' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    onClick={() => setNewReflection({ ...newReflection, mood: 'sad' })}
                  >
                    <Frown className="w-5 h-5 mr-2" />
                    Thoughtful
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Your Reflection</Label>
                <Textarea
                  placeholder="Write about your experiences, insights, challenges, achievements, or any thoughts you'd like to capture..."
                  value={newReflection.content}
                  onChange={(e) => setNewReflection({ ...newReflection, content: e.target.value })}
                  rows={8}
                  className="mt-2"
                />
              </div>
              
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleAddReflection}
              >
                Save Reflection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reflections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-purple-500" />
                <div className="text-3xl font-bold">{userData.reflections.length}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div className="text-3xl font-bold">
                  {userData.reflections.filter(r => {
                    const reflectionDate = new Date(r.date);
                    const now = new Date();
                    return reflectionDate.getMonth() === now.getMonth() && 
                           reflectionDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Recent Mood</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {getMoodIcon(userData.reflections[0]?.mood)}
                <div className="text-lg font-semibold capitalize">
                  {userData.reflections[0]?.mood || 'No mood set'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Reflections List */}
      {userData.reflections.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No reflections yet</h3>
            <p className="text-gray-600 mb-6">Start journaling to track your personal growth</p>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => setIsAddingReflection(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Write Your First Reflection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userData.reflections.map((reflection, index) => (
            <motion.div
              key={reflection.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle>{reflection.title}</CardTitle>
                        {getMoodIcon(reflection.mood)}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(reflection.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReflection(reflection.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{reflection.content}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}