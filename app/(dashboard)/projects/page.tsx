"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Plus,
  BookOpen,
  Film,
  Presentation,
  Package,
  Sparkles,
  MoreVertical,
  Settings,
  Trash2,
  ChevronRight,
  Lock,
  Image as ImageIcon,
  User,
  Zap,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: string;
  name: string;
  description?: string;
  type: "CHILDRENS_BOOK" | "STORYBOARD" | "PRESENTATION" | "BRAND_ASSETS" | "GENERAL";
  imageCount: number;
  thumbnailUrl?: string;
  characterName?: string;
  characterThumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Tina Tortoise Adventures",
    description: "Children's book series about a friendly turtle learning life lessons",
    type: "CHILDRENS_BOOK",
    imageCount: 12,
    thumbnailUrl: "https://picsum.photos/seed/proj1/400/300",
    characterName: "Tina Tortoise",
    characterThumbnail: "https://picsum.photos/seed/char1/100/100",
    createdAt: "2024-12-01T10:00:00Z",
    updatedAt: "2024-12-13T15:30:00Z",
  },
  {
    id: "2",
    name: "Product Launch Video",
    description: "Storyboard for Q1 product launch video",
    type: "STORYBOARD",
    imageCount: 8,
    thumbnailUrl: "https://picsum.photos/seed/proj2/400/300",
    createdAt: "2024-12-05T14:00:00Z",
    updatedAt: "2024-12-10T09:15:00Z",
  },
  {
    id: "3",
    name: "Investor Deck 2025",
    description: "Visual assets for annual investor presentation",
    type: "PRESENTATION",
    imageCount: 15,
    thumbnailUrl: "https://picsum.photos/seed/proj3/400/300",
    createdAt: "2024-12-08T11:00:00Z",
    updatedAt: "2024-12-12T16:45:00Z",
  },
];

const projectTypes = [
  {
    type: "CHILDRENS_BOOK",
    label: "Children's Book",
    icon: BookOpen,
    description: "Character-consistent illustrations",
    color: "from-pink-500 to-orange-500",
  },
  {
    type: "STORYBOARD",
    label: "Storyboard",
    icon: Film,
    description: "Scene-by-scene visuals",
    color: "from-cyan-500 to-blue-500",
  },
  {
    type: "PRESENTATION",
    label: "Presentation",
    icon: Presentation,
    description: "Slide graphics & backgrounds",
    color: "from-violet-500 to-purple-500",
  },
  {
    type: "BRAND_ASSETS",
    label: "Brand Assets",
    icon: Package,
    description: "Consistent brand imagery",
    color: "from-emerald-500 to-teal-500",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

  // Mock - check if user has Pro plan
  const hasPro = false; // Replace with actual subscription check

  const getTypeConfig = (type: string) => {
    return projectTypes.find((t) => t.type === type) || projectTypes[0];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleCreateProject = () => {
    if (!selectedType || !newProjectName.trim()) return;

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      type: selectedType as Project["type"],
      imageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects([newProject, ...projects]);
    setShowNewProject(false);
    setSelectedType(null);
    setNewProjectName("");
  };

  // If user doesn't have Pro, show upgrade prompt
  if (!hasPro) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-violet-400" />
          </div>
          <h1 className="text-2xl font-light mb-3">Projects require Pro</h1>
          <p className="text-white/50 mb-8">
            Create character-consistent projects for children's books, storyboards, presentations,
            and more with our Pro plan.
          </p>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6 text-left">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              What you get with Pro
            </h3>
            <ul className="space-y-3">
              {[
                "Unlimited projects with character consistency",
                "500 images per month",
                "Pro model access for higher quality",
                "4K resolution support",
                "Batch generation (up to 10 at once)",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/settings/billing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all font-medium"
          >
            <Zap className="w-4 h-4" />
            Upgrade to Pro — $19/mo
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light mb-1">Projects</h1>
              <p className="text-white/40">
                Organize images with consistent characters and styles
              </p>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderKanban className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-light text-white/60 mb-2">No projects yet</h3>
            <p className="text-white/40 mb-6">
              Create a project to organize images with consistent characters
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => {
              const typeConfig = getTypeConfig(project.type);
              const Icon = typeConfig.icon;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/projects/${project.id}`}
                    className="group block bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-white/5 to-white/[0.02]">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="w-12 h-12 text-white/20" />
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-3 left-3">
                        <div
                          className={`px-2 py-1 rounded-lg bg-gradient-to-r ${typeConfig.color} text-xs font-medium flex items-center gap-1.5`}
                        >
                          <Icon className="w-3 h-3" />
                          {typeConfig.label}
                        </div>
                      </div>

                      {/* Character Badge */}
                      {project.characterName && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xl">
                          {project.characterThumbnail ? (
                            <img
                              src={project.characterThumbnail}
                              alt={project.characterName}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-white/60" />
                          )}
                          <span className="text-xs text-white/80">{project.characterName}</span>
                        </div>
                      )}

                      {/* Hover Arrow */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-2 rounded-lg bg-black/50 backdrop-blur-xl">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-medium mb-1 group-hover:text-violet-300 transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-white/40 line-clamp-1 mb-3">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {project.imageCount} images
                        </span>
                        <span>Updated {formatDate(project.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowNewProject(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-light">New Project</h2>
                <p className="text-sm text-white/40 mt-1">
                  Choose a project type to get started
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Project Type Selection */}
                <div>
                  <label className="text-sm text-white/60 mb-3 block">Project Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {projectTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = selectedType === type.type;

                      return (
                        <button
                          key={type.type}
                          onClick={() => setSelectedType(type.type)}
                          className={`relative p-4 rounded-xl text-left transition-all border ${
                            isSelected
                              ? "bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border-violet-500/50"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-3`}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-medium block">{type.label}</span>
                          <span className="text-xs text-white/40">{type.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Project Name */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My awesome project..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!selectedType || !newProjectName.trim()}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
