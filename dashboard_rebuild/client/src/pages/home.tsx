import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Joystick, Gamepad2, Trophy, Skull, Zap, Play, Settings, Volume2 } from "lucide-react";
import arcadeBg from "@assets/generated_images/dark_retro_arcade_grid_background_texture.png";

export default function Home() {
  const [activeTab, setActiveTab] = useState("ui-elements");
  
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background with overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: `url(${arcadeBg})`, 
          backgroundSize: '300px' 
        }}
      />
      <div className="fixed inset-0 z-10 crt-overlay pointer-events-none" />
      
      <div className="relative z-20 container mx-auto p-4 md:p-8 max-w-6xl">
        {/* Header Section */}
        <header className="mb-12 border-b-4 border-primary pb-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
          >
            <div>
              <h1 className="text-4xl md:text-6xl mb-2 text-glow">ARCADE_UI</h1>
              <p className="text-xl md:text-2xl text-muted-foreground uppercase tracking-wider">
                System Ready <span className="animate-pulse">_</span>
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="text-right hidden md:block">
                <div className="text-xs text-muted-foreground">CREDITS</div>
                <div className="text-xl text-primary font-arcade">99</div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-xs text-muted-foreground">SCORE</div>
                <div className="text-xl text-primary font-arcade">000000</div>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Main Content Area */}
        <Tabs defaultValue="ui-elements" className="w-full" onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Navigation (Retro Style) */}
            <aside className="w-full md:w-64 flex-shrink-0">
              <div className="border-4 border-secondary p-1 bg-black/50 backdrop-blur-sm mb-6">
                <div className="border border-secondary p-4">
                  <h3 className="text-lg mb-4 text-white flex items-center gap-2">
                    <Joystick className="w-5 h-5 text-primary" /> MENU
                  </h3>
                  <TabsList className="flex flex-col h-auto bg-transparent items-start space-y-2 w-full p-0">
                    <TabsTrigger 
                      value="ui-elements" 
                      className="w-full justify-start font-arcade text-xs p-3 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-none hover:bg-secondary/20 transition-colors"
                    >
                      <Gamepad2 className="w-4 h-4 mr-2" /> CONTROLS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="typography" 
                      className="w-full justify-start font-arcade text-xs p-3 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-none hover:bg-secondary/20 transition-colors"
                    >
                      <Zap className="w-4 h-4 mr-2" /> TEXT_MODE
                    </TabsTrigger>
                    <TabsTrigger 
                      value="layout" 
                      className="w-full justify-start font-arcade text-xs p-3 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-none hover:bg-secondary/20 transition-colors"
                    >
                      <Trophy className="w-4 h-4 mr-2" /> LEVELS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="settings" 
                      className="w-full justify-start font-arcade text-xs p-3 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-none hover:bg-secondary/20 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-2" /> OPTIONS
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Status Box */}
              <div className="border-2 border-dashed border-muted p-4 bg-black/50">
                <div className="flex justify-between text-xs mb-2">
                  <span>CPU</span>
                  <span className="text-primary">87%</span>
                </div>
                <Progress value={87} className="h-2 mb-4 bg-secondary" indicatorClassName="bg-primary" />
                
                <div className="flex justify-between text-xs mb-2">
                  <span>MEM</span>
                  <span className="text-primary">42%</span>
                </div>
                <Progress value={42} className="h-2 bg-secondary" indicatorClassName="bg-primary" />
              </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 min-h-[500px]">
              
              <TabsContent value="ui-elements" className="mt-0 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                
                {/* Buttons Section */}
                <section>
                  <h2 className="text-2xl mb-6 flex items-center gap-2">
                    <span className="w-4 h-4 bg-primary inline-block"></span> 
                    ACTION_BUTTONS
                  </h2>
                  
                  <div className="grid gap-6 p-6 border border-secondary bg-black/40">
                    <div className="flex flex-wrap gap-4 items-center">
                      <Button className="font-arcade rounded-none border-b-4 border-r-4 border-primary/50 hover:border-primary active:border-0 active:translate-y-1 bg-primary text-black hover:bg-primary hover:brightness-110 h-12 px-6">
                        START GAME
                      </Button>
                      
                      <Button variant="secondary" className="font-arcade rounded-none border border-white/20 hover:border-white h-12 px-6">
                        CONTINUE
                      </Button>
                      
                      <Button variant="destructive" className="font-arcade rounded-none h-12 px-6 border-b-4 border-destructive-foreground/30">
                        GAME OVER
                      </Button>
                      
                      <Button variant="outline" className="font-arcade rounded-none border-primary text-primary hover:bg-primary hover:text-black h-12 px-6 border-2">
                        INSERT COIN
                      </Button>
                    </div>

                    <Separator className="bg-secondary" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="font-arcade text-xs text-primary">PLAYER_NAME</Label>
                        <div className="flex gap-2">
                          <Input 
                            className="bg-black border-2 border-secondary font-arcade text-primary focus-visible:ring-primary rounded-none h-12" 
                            placeholder="ENTER INITIALS" 
                          />
                          <Button className="rounded-none bg-secondary h-12 w-12 border-2 border-secondary hover:border-white">OK</Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="font-arcade text-xs text-primary">DIFFICULTY</Label>
                        <div className="flex items-center space-x-2 border-2 border-secondary p-2 bg-black h-12">
                          <Switch id="hard-mode" className="data-[state=checked]:bg-primary" />
                          <Label htmlFor="hard-mode" className="font-terminal text-lg cursor-pointer">HARDCORE_MODE</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Cards Section */}
                <section>
                  <h2 className="text-2xl mb-6 flex items-center gap-2">
                    <span className="w-4 h-4 bg-primary inline-block"></span> 
                    DATA_MODULES
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-none border-2 border-secondary bg-black/80 hover:border-primary transition-colors group">
                      <CardHeader className="border-b border-secondary pb-4">
                        <CardTitle className="font-arcade text-sm text-primary group-hover:text-glow">HIGH_SCORES</CardTitle>
                        <CardDescription className="font-terminal uppercase">Weekly Top Players</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 font-terminal text-lg space-y-2">
                        <div className="flex justify-between"><span>1. ALEX</span> <span className="text-primary">999,999</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>2. KAI</span> <span>850,420</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>3. ZED</span> <span>720,000</span></div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-none border-2 border-primary bg-primary/5">
                      <CardHeader className="border-b border-primary/30 pb-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="font-arcade text-sm text-white">WARNING</CardTitle>
                          <Skull className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 font-terminal text-lg">
                        <p className="mb-4 text-red-400">BOSS_LEVEL_DETECTED</p>
                        <Button className="w-full font-arcade rounded-none bg-red-600 hover:bg-red-500 text-white border-2 border-red-800">
                          ENGAGE
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </section>

              </TabsContent>

              <TabsContent value="typography" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                 <section className="space-y-8 border-l-4 border-primary pl-8 py-4">
                    <div>
                      <h1 className="text-4xl md:text-6xl mb-4">HEADING 1</h1>
                      <p className="text-muted-foreground font-terminal">Font: Press Start 2P / 48px</p>
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl mb-4">HEADING 2</h2>
                      <p className="text-muted-foreground font-terminal">Font: Press Start 2P / 36px</p>
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl mb-4 text-white">HEADING 3</h3>
                      <p className="text-muted-foreground font-terminal">Font: Press Start 2P / 24px</p>
                    </div>
                    <div className="bg-white/5 p-6 border border-white/10">
                      <p className="text-xl leading-relaxed max-w-2xl mb-4">
                        This is the standard body text using the 'VT323' font family. It is designed to look like an old terminal screen. 
                        It supports <strong>bold text</strong> and <em>italicized text</em> for emphasis.
                      </p>
                      <p className="text-xl leading-relaxed max-w-2xl text-primary">
                        &gt; System logs indicate a breach in sector 7G.
                        <br/>
                        &gt; Initiating containment protocols...
                      </p>
                    </div>
                 </section>
              </TabsContent>
              
              <TabsContent value="layout" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                    <div key={level} className="aspect-square border-2 border-secondary hover:border-primary hover:bg-primary/10 flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] opacity-20 group-hover:opacity-40 transition-opacity bg-cover bg-center mix-blend-overlay"></div>
                      <span className="font-arcade text-4xl text-secondary group-hover:text-primary z-10">{level}</span>
                      <span className="font-terminal text-xs mt-2 text-muted-foreground group-hover:text-white z-10">LEVEL</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <Card className="rounded-none bg-black border border-secondary">
                  <CardHeader>
                    <CardTitle className="font-arcade text-sm">SYSTEM_CONFIG</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between font-terminal text-lg">
                        <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> MASTER_VOLUME</span>
                        <span>80%</span>
                      </div>
                      <Slider defaultValue={[80]} max={100} step={1} className="[&>.relative>.bg-primary]:bg-primary [&>.relative]:bg-secondary" />
                    </div>
                    
                    <Separator className="bg-secondary" />
                    
                    <div className="flex items-center justify-between">
                      <Label className="font-terminal text-lg">SCANLINES</Label>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="font-terminal text-lg">CRT_CURVATURE</Label>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="font-terminal text-lg">BLOOM_EFFECT</Label>
                      <Switch />
                    </div>
                  </CardContent>
                  <CardFooter>
                     <Button className="w-full font-arcade rounded-none border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-black">
                        RESET_DEFAULTS
                     </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

            </main>
          </div>
        </Tabs>

      </div>
    </div>
  );
}
