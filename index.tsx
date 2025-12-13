
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- Fix for Google Translate causing React crashes (Robust Version) ---
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  // @ts-ignore
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      if (child.parentNode !== this) {
        if (console && console.debug) {
          console.debug('Google Translate Fix: Cannot remove a child from a different parent. Ignoring.');
        }
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    } catch (error) {
      // If it fails (e.g. node not found), we ignore it to prevent app crash
      console.warn('Google Translate Fix: removeChild threw an error, ignoring.', error);
      return child;
    }
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  // @ts-ignore
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    try {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (console && console.debug) {
          console.debug('Google Translate Fix: Cannot insert before a reference node from a different parent. Appending instead.');
        }
        return this.appendChild(newNode) as T;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (error) {
      console.warn('Google Translate Fix: insertBefore threw an error, ignoring.', error);
      return newNode;
    }
  };
}
// -----------------------------------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
