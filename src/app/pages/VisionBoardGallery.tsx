import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getUserData, UserData, deleteVisionBoard } from "../utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Images, Plus, Trash2, Edit, Eye, Calendar, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export function VisionBoardGallery() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = () => {
    const data = getUserData();
    setUserData(data);
  };
  
  const handleDeleteBoard = (boardId: string) => {
    if (confirm('Are you sure you want to delete this vision board?')) {
      deleteVisionBoard(boardId);
      loadData();
    }
  };
  
  if (!userData) return null;
  
  // Group boards by year
  const boardsByYear = userData.visionBoards.reduce((acc, board) => {
    if (!acc[board.year]) acc[board.year] = [];
    acc[board.year].push(board);
    return acc;
  }, {} as Record<string, typeof userData.visionBoards>);
  
  const years = Object.keys(boardsByYear).sort((a, b) => parseInt(b) - parseInt(a));
  
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vision Board Gallery</h1>
          <p className="text-gray-600 mt-1">Browse and manage your vision boards</p>
        </div>
        
        <Button
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          onClick={() => navigate('/vision-board')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Board
        </Button>
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
              <CardTitle className="text-sm font-medium text-gray-600">Total Boards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Images className="w-8 h-8 text-purple-500" />
                <div className="text-3xl font-bold">{userData.visionBoards.length}</div>
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
              <CardTitle className="text-sm font-medium text-gray-600">Years Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div className="text-3xl font-bold">{years.length}</div>
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
              <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-pink-500" />
                <div className="text-3xl font-bold">
                  {userData.visionBoards.reduce((sum, b) => sum + b.items.length, 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Gallery */}
      {userData.visionBoards.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <Images className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No vision boards yet</h3>
            <p className="text-gray-600 mb-6">Create your first vision board to visualize your dreams</p>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => navigate('/vision-board')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Vision Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-500" />
                {year}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boardsByYear[year].map((board, index) => (
                  <motion.div
                    key={board.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all group">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{board.name}</CardTitle>
                            <CardDescription>
                              {board.items.length} items • Created{' '}
                              {new Date(board.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Preview of the board */}
                        <div className="relative bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                          {board.items.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Sparkles className="w-12 h-12 text-gray-300" />
                            </div>
                          ) : (
                            <div className="relative w-full h-full">
                              {board.items.slice(0, 6).map((item) => (
                                <div
                                  key={item.id}
                                  className="absolute"
                                  style={{
                                    left: `${item.x}%`,
                                    top: `${item.y}%`,
                                    width: `${item.width * 0.5}px`,
                                  }}
                                >
                                  {item.type === 'image' && (
                                    <ImageWithFallback
                                      src={item.content}
                                      alt="Board item"
                                      className="rounded shadow-sm w-full h-auto"
                                    />
                                  )}
                                  {item.type === 'quote' && (
                                    <div className="bg-white/80 p-2 rounded shadow-sm text-xs italic line-clamp-2">
                                      {item.content}
                                    </div>
                                  )}
                                  {item.type === 'icon' && (
                                    <div className="bg-purple-400 p-2 rounded-full shadow-sm">
                                      <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => navigate(`/vision-board/${board.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteBoard(board.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
