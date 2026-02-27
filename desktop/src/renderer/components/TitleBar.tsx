function TitleBar() {
    const handleMinimize = () => {
        window.electronAPI?.windowMinimize();
    };

    const handleMaximize = () => {
        window.electronAPI?.windowMaximize();
    };

    const handleClose = () => {
        window.electronAPI?.windowClose();
    };

    return (
        <div className="title-bar">
            <div className="title-bar__title">TODO MEMORY</div>
            <div className="title-bar__controls">
                <button
                    className="window-btn window-btn--minimize"
                    onClick={handleMinimize}
                    title="Minimize"
                />
                <button
                    className="window-btn window-btn--maximize"
                    onClick={handleMaximize}
                    title="Maximize"
                />
                <button
                    className="window-btn window-btn--close"
                    onClick={handleClose}
                    title="Close"
                />
            </div>
        </div>
    );
}

export default TitleBar;
