import { useEffect, useState } from "react";
import type React from "react";
import { useParams, useNavigate } from "react-router";
import { DndProvider, useDrag } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { getUserData, addVisionBoard, updateVisionBoard, VisionBoard, VisionBoardItem } from "../utils/storage";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Image, MessageSquareQuote, Star, Save, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface DraggableItemProps {
  item: VisionBoardItem;
  onUpdate: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

const ICON_OPTIONS = ['Star', 'Heart', 'Target', 'Trophy', 'Zap', 'Sun', 'Moon', 'Sparkles'];

function DraggableItem({ item, onUpdate, onDelete }: DraggableItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'board-item',
    item: { id: item.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleDragEnd = (e: React.DragEvent) => {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onUpdate(item.id, Math.max(0, Math.min(95, x)), Math.max(0, Math.min(95, y)));
  };

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      draggable
      onDragEnd={handleDragEnd}
      className="absolute cursor-move group"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width}px`,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="relative">
        {item.type === 'image' && (
          <ImageWithFallback
            src={item.content}
            alt="Vision board item"
            className="rounded-lg shadow-lg w-full h-auto"
            style={{ width: `${item.width}px` }}
          />
        )}

        {item.type === 'quote' && (
          <div
            className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border-2 border-purple-200"
            style={{ width: `${item.width}px` }}
          >
            <p className="text-sm italic text-gray-800">{item.content}</p>
          </div>
        )}

        {item.type === 'icon' && (
          <div className="bg-gradient-to-br from-purple-400 to-pink-400 p-4 rounded-full shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        )}

        <Button
          size="sm"
          variant="destructive"
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0 rounded-full"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function VisionBoardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [boardName, setBoardName] = useState('');
  const [boardYear, setBoardYear] = useState(new Date().getFullYear().toString());
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (id) {
      const userData = getUserData();
      const existingBoard = userData.visionBoards.find(b => b.id === id);
      if (existingBoard) {
        setBoard(existingBoard);
        setBoardName(existingBoard.name);
        setBoardYear(existingBoard.year);
      }
    } else {
      setBoard({
        id: 'temp',
        name: '',
        year: new Date().getFullYear().toString(),
        items: [],
        createdAt: new Date().toISOString(),
      });
    }
  }, [id]);

  const handleSave = () => {
    if (!board || !boardName) return;

    if (id) {
      updateVisionBoard(id, { name: boardName, year: boardYear, items: board.items });
      toast.success('Vision board updated!');
    } else {
      addVisionBoard({ name: boardName, year: boardYear, items: board.items });
      toast.success('Vision board created!', {
        description: 'Your vision board has been saved to the gallery.',
      });
    }

    navigate('/gallery');
  };

  const handleAddImage = async () => {
    if (!searchQuery.trim() || !board) return;

    setIsSearching(true);
    // Use picsum.photos for placeholder images (source.unsplash.com is deprecated)
    const seed = encodeURIComponent(searchQuery) + Date.now();
    const imageUrl = `https://picsum.photos/seed/${seed}/400/300`;

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: 'image',
      content: imageUrl,
      x: 10 + (board.items.length * 5) % 50,
      y: 10 + (board.items.length * 5) % 50,
      width: 200,
      height: 200,
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setSearchQuery('');
    setIsAddingItem(false);
    setIsSearching(false);
  };

  const handleAddQuote = () => {
    if (!quoteText.trim() || !board) return;

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: 'quote',
      content: quoteText,
      x: 10 + (board.items.length * 5) % 50,
      y: 10 + (board.items.length * 5) % 50,
      width: 250,
      height: 100,
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setQuoteText('');
    setIsAddingItem(false);
  };

  const handleUpdateItemPosition = (itemId: string, x: number, y: number) => {
    if (!board) return;

    const updatedItems = board.items.map(item =>
      item.id === itemId ? { ...item, x, y } : item
    );

    setBoard({ ...board, items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!board) return;
    setBoard({ ...board, items: board.items.filter(item => item.id !== itemId) });
  };

  if (!board) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Vision Board Name (e.g., 2026 Goals)"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Year"
              value={boardYear}
              onChange={(e) => setBoardYear(e.target.value)}
              className="w-24"
            />

            <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Vision Board</DialogTitle>
                  <DialogDescription>
                    Add images, quotes, or icons to visualize your goals
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="image" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image">
                      <Image className="w-4 h-4 mr-2" />
                      Image
                    </TabsTrigger>
                    <TabsTrigger value="quote">
                      <MessageSquareQuote className="w-4 h-4 mr-2" />
                      Quote
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="space-y-4">
                    <Input
                      placeholder="Search for images (e.g., mountain summit, success)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
                    />
                    <Button
                      className="w-full"
                      onClick={handleAddImage}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      {isSearching ? 'Searching...' : 'Add Image'}
                    </Button>
                  </TabsContent>

                  <TabsContent value="quote" className="space-y-4">
                    <Input
                      placeholder="Enter a motivational quote..."
                      value={quoteText}
                      onChange={(e) => setQuoteText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddQuote()}
                    />
                    <Button
                      className="w-full"
                      onClick={handleAddQuote}
                      disabled={!quoteText.trim()}
                    >
                      Add Quote
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleSave}
              disabled={!boardName}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div
              className="relative bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 min-h-[600px]"
              style={{ aspectRatio: '16/9' }}
            >
              {board.items.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your vision board is empty</p>
                    <p className="text-sm">Click "Add Item" to start building your vision</p>
                  </div>
                </div>
              ) : (
                board.items.map(item => (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    onUpdate={handleUpdateItemPosition}
                    onDelete={handleDeleteItem}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-900">
            <strong>💡 Tip:</strong> Drag and drop items to arrange them. Click the trash icon to remove items.
            Your vision board will be saved to your gallery when you click Save.
          </p>
        </div>
      </div>
    </DndProvider>
  );
}