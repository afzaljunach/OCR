import React, { useState } from 'react';
import {Button, ButtonGroup} from "@heroui/button";

function UploadSection() {
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event) => {
        if (event.target.files.length > 0) {
            setFileName(event.target.files[0].name);
        } else {
            setFileName('');
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg mx-auto w-full">
            <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">Upload Document</h2>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 transition-all duration-300">
                <svg
                    className="w-16 h-16 text-primary-500 mb-4 transition-all duration-300"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                <label
                    htmlFor="file-upload"
                    className="text-gray-600 cursor-pointer text-center hover:text-primary-600 transition-all duration-300"
                >
                    <span className="block text-xl font-medium">Drag & Drop your document here</span>
                    <span className="block text-sm text-gray-400">Or click to browse</span>
                </label>
                {fileName && <div className="mt-3 text-gray-700 text-sm font-medium">{fileName}</div>}
            </div>
            <Button
                className="mt-5 w-full"
                isLoading={false}
                isDisabled={!fileName}
                color="primary"
                size="md"  
            >Upload &amp; Process</Button>
        </div>
    );
}

export default UploadSection;
