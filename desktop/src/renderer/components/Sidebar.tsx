import { Category } from '../types';

interface SidebarProps {
    categories: Category[];
    activeCategory: Category | null;
    onCategoryChange: (category: Category) => void;
    isConnected: boolean;
}

function Sidebar({ categories, activeCategory, onCategoryChange, isConnected }: SidebarProps) {
    return (
        <div className="sidebar">
            <div className="sidebar__section">
                <div className="sidebar__label">Categories</div>
                <div className="category-list">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            className={`category-item ${activeCategory?.id === category.id ? 'category-item--active' : ''
                                }`}
                            onClick={() => onCategoryChange(category)}
                            style={{
                                '--category-color': category.color,
                            } as React.CSSProperties}
                        >
                            <span className="category-item__icon">{category.icon}</span>
                            <span className="category-item__name">{category.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="sidebar__section">
                <div className="sidebar__label">Quick Access</div>
                <div className="category-list">
                    <div className="category-item">
                        <span className="category-item__icon">🗑️</span>
                        <span className="category-item__name">Bin</span>
                    </div>
                    <div className="category-item">
                        <span className="category-item__icon">📦</span>
                        <span className="category-item__name">Archive</span>
                    </div>
                </div>
            </div>

            <div
                className={`connection-status connection-status--${isConnected ? 'connected' : 'disconnected'
                    }`}
            >
                <span className="connection-status__dot" />
                {isConnected ? 'Connected' : 'Disconnected'}
            </div>
        </div>
    );
}

export default Sidebar;
