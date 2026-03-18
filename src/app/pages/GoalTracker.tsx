import { useEffect, useState } from "react";
import { getUserData, UserData, addGoal, updateGoal, deleteGoal, calculateGoalProgress, LIFE_AREAS } from "../utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Plus, Trash2, CheckCircle2, Circle, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export function GoalTracker() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    category: '',
    title: '',
    description: '',
    deadline: '',
  });
  const [newTask, setNewTask] = useState('');
  const [addingTaskToGoalId, setAddingTaskToGoalId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getUserData();
    setUserData(data);
  };

  const handleAddGoal = () => {
    if (!newGoal.category || !newGoal.title || !newGoal.deadline) return;

    addGoal({
      ...newGoal,
      tasks: [],
    });

    toast.success('Goal created successfully!', {
      description: 'Start adding tasks to track your progress.',
    });

    setNewGoal({ category: '', title: '', description: '', deadline: '' });
    setIsAddingGoal(false);
    loadData();
  };

  const handleAddTask = (goalId: string) => {
    if (!newTask.trim()) return;

    const goal = userData?.goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedTasks = [
      ...goal.tasks,
      {
        id: `task_${Date.now()}`,
        title: newTask,
        completed: false,
      },
    ];

    updateGoal(goalId, { tasks: updatedTasks });
    setNewTask('');
    setAddingTaskToGoalId(null);
    loadData();
  };

  const handleToggleTask = (goalId: string, taskId: string) => {
    const goal = userData?.goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedTasks = goal.tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );

    updateGoal(goalId, { tasks: updatedTasks });

    const taskWasCompleted = !goal.tasks.find(t => t.id === taskId)?.completed;
    if (taskWasCompleted) {
      toast.success('Task completed! 🎉');
    }

    loadData();
  };

  const handleDeleteTask = (goalId: string, taskId: string) => {
    const goal = userData?.goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedTasks = goal.tasks.filter(task => task.id !== taskId);
    updateGoal(goalId, { tasks: updatedTasks });
    loadData();
  };

  const handleDeleteGoal = (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      deleteGoal(goalId);
      loadData();
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (!userData) return null;

  const goalsByCategory = userData.goals.reduce((acc, goal) => {
    if (!acc[goal.category]) acc[goal.category] = [];
    acc[goal.category].push(goal);
    return acc;
  }, {} as Record<string, typeof userData.goals>);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goal Tracker</h1>
          <p className="text-gray-600 mt-1">Break down your dreams into achievable milestones</p>
        </div>

        <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Define a specific goal and break it down into actionable tasks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={newGoal.category}
                  onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a life area" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFE_AREAS.map(area => (
                      <SelectItem key={area.name} value={area.name}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Goal Title</Label>
                <Input
                  placeholder="e.g., Run a marathon"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Add more details about your goal..."
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>Target Deadline</Label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleAddGoal}
              >
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {userData.goals.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-6">Start your journey by creating your first goal</p>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => setIsAddingGoal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(goalsByCategory).map(([category, goals]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: LIFE_AREAS.find(a => a.name === category)?.color }}
                />
                {category}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {goals.map((goal, index) => {
                  const progress = calculateGoalProgress(goal);
                  const daysLeft = getDaysUntilDeadline(goal.deadline);
                  const isOverdue = daysLeft < 0;
                  const isCompleted = progress === 100;

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`bg-white/80 backdrop-blur-md border-0 shadow-lg ${isCompleted ? 'border-2 border-green-400' : ''}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="flex items-center gap-2">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-400" />
                                )}
                                {goal.title}
                              </CardTitle>
                              {goal.description && (
                                <CardDescription className="mt-2">{goal.description}</CardDescription>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGoal(goal.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span className={isOverdue && !isCompleted ? 'text-red-500 font-medium' : ''}>
                                {isOverdue && !isCompleted
                                  ? `${Math.abs(daysLeft)} days overdue`
                                  : isCompleted
                                    ? 'Completed!'
                                    : `${daysLeft} days left`}
                              </span>
                            </div>
                            <div className="flex-1" />
                            <span className="text-sm font-semibold text-purple-600">
                              {progress}% Complete
                            </span>
                          </div>
                          <Progress value={progress} className="h-2 mt-2" />
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {goal.twelveWeekPlan && (
                            <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 space-y-1">
                              <p className="text-sm font-semibold text-purple-700">12 Week Plan Active</p>
                              <p className="text-xs text-purple-700">
                                Current week: {goal.twelveWeekPlan.currentWeek}/{goal.twelveWeekPlan.totalWeeks}
                              </p>
                              <p className="text-xs text-purple-700">Review day: {goal.twelveWeekPlan.reviewDay}</p>
                              <p className="text-xs text-purple-700">
                                Weekly actions: {goal.twelveWeekPlan.weeklyActions.length}
                              </p>
                            </div>
                          )}

                          {goal.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group"
                            >
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => handleToggleTask(goal.id, task.id)}
                              />
                              <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteTask(goal.id, task.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ))}

                          {addingTaskToGoalId === goal.id ? (
                            <div className="flex gap-2 mt-4">
                              <Input
                                placeholder="Enter task..."
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask(goal.id)}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddTask(goal.id)}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAddingTaskToGoalId(null);
                                  setNewTask('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => setAddingTaskToGoalId(goal.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Task
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
